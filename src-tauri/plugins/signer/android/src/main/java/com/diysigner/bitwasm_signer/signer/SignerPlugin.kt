package com.diysigner.bitwasm_signer.signer

import android.Manifest
import android.app.Activity
import android.app.Application
import android.os.Build
import android.os.Bundle
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.text.InputType
import android.view.inputmethod.EditorInfo
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager.Authenticators
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import app.tauri.PermissionState
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import com.diysigner.bitwasm_signer.signer.Design.fail
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.util.concurrent.Executors
import java.security.SecureRandom
import javax.crypto.Cipher
import kotlin.random.asKotlinRandom

@InvokeArg
class SetNetworkArgs {
    var testnet = false
}

@InvokeArg
class SetStorageArgs {
    var enabled = false
}

@InvokeArg
class SetThemeArgs {
    var theme = "system"
}

@InvokeArg
class SetRestrictionArgs {
    var id = ""
    var level = ""
}

@TauriPlugin(permissions = [Permission(strings = [Manifest.permission.CAMERA], alias = "camera")])
class SignerPlugin(launched: Activity) : Plugin(launched) {
    // Tauri keeps this plugin when the activity is recreated (a language change, say), so dialogs follow the new one
    private var activity: Activity = launched
    private val worker = Executors.newSingleThreadExecutor()
    private val engine by lazy { SignerEngine(activity) }
    private val vault by lazy { KeyVault(activity) }
    private val restrictions by lazy { DeviceRestrictions(activity) { worker.execute { engine.lock() } } }
    private var pendingScanMode = "seed"
    // How the new wallet being written down was made: its rolls, kept until the flow ends or the user clears them
    private class Origin(val dice: Boolean, val rolls: ByteArray?)
    private var origin: Origin? = null
    private var started = 0
    @Volatile private var authenticating = false

    override fun load(webView: android.webkit.WebView) {
        // Leaving the app wipes the key. The scanner and QR screens are ours, so they keep the count above zero
        if ((activity as AppCompatActivity).lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) started = 1
        activity.application.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
            override fun onActivityStarted(a: Activity) { started++ }
            override fun onActivityStopped(a: Activity) {
                started = maxOf(0, started - 1)
                if (started == 0 && !authenticating) worker.execute { engine.lock() }
            }
            override fun onActivityCreated(a: Activity, state: Bundle?) {
                if (a.javaClass == activity.javaClass) activity = a
                protect(a.window)
            }
            override fun onActivityResumed(a: Activity) = Unit
            override fun onActivityPaused(a: Activity) = Unit
            override fun onActivitySaveInstanceState(a: Activity, state: Bundle) = Unit
            override fun onActivityDestroyed(a: Activity) = Unit
        })
        protect(activity.window)
        engine.blockedBy = restrictions::blockedBy
        restrictions.start()
    }

    // Overlays from other apps can cover or fake our buttons. Debug builds keep screenshots for development
    private fun protect(window: Window) {
        if (activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE == 0) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) window.setHideOverlayWindows(true)
    }

    @Command
    fun state(invoke: Invoke) {
        invoke.resolve(stateObject())
    }

    @Command
    fun setNetwork(invoke: Invoke) {
        try {
            engine.setNetwork(invoke.parseArgs(SetNetworkArgs::class.java).testnet)
            invoke.resolve(stateObject())
        } catch (e: Exception) {
            invoke.fail(e.message ?: "Could not change the network")
        }
    }

    @Command
    fun lock(invoke: Invoke) {
        engine.lock()
        invoke.resolve()
    }

    @Command
    fun parserInfo(invoke: Invoke) {
        try {
            val result = JSObject()
            result.put("hash", engine.parserInfo())
            invoke.resolve(result)
        } catch (e: Exception) {
            invoke.fail(e.message ?: "Could not initialize the WASM runtime")
        }
    }

    // The engine packs all four purposes or none, so the choice is all of them (null) or exactly one
    @Command
    fun exportAccount(invoke: Invoke) {
        if (!engine.isLoaded) { invoke.fail("Load a SeedQR first"); return }
        val p = Design.palette(activity)
        val t = engine.testnet
        val kinds = listOf(
            Triple(null, Design.tr("4種類", "All 4"), Design.tr("まとめて渡す・おすすめ", "All at once · recommended")),
            Triple(84, if (t) "tb1q…" else "bc1q…", Design.tr("標準・いちばん一般的", "Standard · most common")),
            Triple(86, if (t) "tb1p…" else "bc1p…", Design.tr("Taproot・新しい形式", "Taproot · newest")),
            Triple(49, if (t) "2…" else "3…", Design.tr("古いウォレット向け", "For older wallets")),
            Triple(48, if (t) "tb1q…" else "bc1q…", Design.tr("マルチシグ用・複数の鍵で管理", "Multisig · several keys")),
        )
        var chosen: Int? = null
        val single = Design.text(activity, Design.tr("1種類だけ渡す", "ONLY ONE KIND"), Design.Style.CAPTION, p.inkMuted).apply { setTypeface(typeface, Typeface.BOLD) }
        val heading = Design.tr("ウォレットアプリと接続する", "Connect your wallet app")
        val show = Design.button(activity, Design.tr("QRを表示", "Show QR"), true, p)
        val summary = Design.text(activity, "", Design.Style.BODY, p.ink)
        val cards = mutableListOf<LinearLayout>()
        val marks = mutableListOf<View>()
        fun refresh() {
            kinds.forEachIndexed { i, (purpose) ->
                val on = chosen == purpose
                cards[i].background = Design.shape(activity, if (on) p.primarySoft else p.surfaceRaised, if (on) p.primary else p.line, DesignTokens.RADIUS_MD)
                marks[i].background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(if (on) p.primary else p.surfaceRaised)
                    setStroke(dp(if (on) 6 else 2), if (on) p.primarySoft else p.lineStrong)
                }
            }
            summary.text = chosen?.let { Design.tr("BIP${it}のxpubとディスクリプターを渡します。xpubだけを読むアプリにも使えます。", "Shares the BIP$it xpub and descriptor, which wallets that only read an xpub accept too.") }
                ?: Design.tr("4種類を1つのアニメーションQR(UR crypto-account)で渡します。Sparrow、Nunchuk、Keystoneなどで読めます。", "All four go in one animated QR (UR crypto-account) for Sparrow, Nunchuk, Keystone and similar wallets.")
        }
        val list = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
        kinds.forEachIndexed { i, (purpose, prefix, name) ->
            val mark = View(activity)
            val card = LinearLayout(activity).apply {
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(12), dp(12), dp(16), dp(12))
                addView(Design.text(activity, prefix, Design.Style.DATA, p.ink).apply {
                    textSize = 20f
                    setTypeface(typeface, Typeface.BOLD)
                    gravity = Gravity.CENTER
                    background = Design.shape(activity, p.surface, p.line, DesignTokens.RADIUS_SM)
                }, LinearLayout.LayoutParams(dp(96), dp(52)))
                addView(LinearLayout(activity).apply {
                    orientation = LinearLayout.VERTICAL
                    addView(Design.text(activity, name, Design.Style.LABEL, p.ink))
                    addView(Design.text(activity, purpose?.let { "BIP$it" } ?: "BIP84・86・49・48", Design.Style.CAPTION, p.inkMuted))
                }, LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(14) })
                addView(mark, LinearLayout.LayoutParams(dp(24), dp(24)))
                setOnClickListener { chosen = purpose; refresh() }
            }
            cards.add(card)
            marks.add(mark)
            if (i == 1) list.addView(single, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(DesignTokens.SPACE_6) })
            list.addView(card, LinearLayout.LayoutParams(-1, -2).apply { if (i > 0) topMargin = dp(DesignTokens.SPACE_2) })
        }
        val content = page(
            Design.text(activity, Design.tr("渡す公開鍵を選ぶ", "Choose the keys to share"), Design.Style.DISPLAY, p.ink),
            Design.text(activity, Design.tr("左の文字は、受け取りアドレスの始まり方です。公開鍵だけを渡し、秘密鍵は含まれていません。", "On the left is how each kind of receive address starts. Only public keys are shared, never private keys."), Design.Style.BODY, p.inkMuted),
            list,
            summary,
        )
        lateinit var dialog: android.app.Dialog
        show.setOnClickListener {
            dialog.dismiss()
            chosen?.let { exportAccountKey(invoke, it) }
                ?: showFrames(invoke, heading, Design.tr("ウォレットアプリで読み取ってください。BIP49、BIP84、BIP86とBIP48のマルチシグ用の公開鍵を、1つのアニメーションQRで渡します。", "Scan with your wallet: BIP49, BIP84, BIP86 and the BIP48 multisig key in one animated QR.")) { engine.accountUr() }
        }
        dialog = Design.screen(activity, heading, t, content, listOf(show)) { invoke.fail("Account export was cancelled") }
        refresh()
        dialog.show()
    }

    private fun showFrames(invoke: Invoke, title: String, description: String, frames: () -> List<String>) {
        worker.execute {
            try {
                val intent = Intent(activity, SignedQrActivity::class.java)
                    .putStringArrayListExtra(SignedQrActivity.FRAMES, ArrayList(frames()))
                    .putExtra("testnet", engine.testnet)
                    .putExtra("heading", title)
                    .putExtra("description", description)
                    .putExtra("qrName", "crypto-account")
                    .putExtra("accountQr", true)
                activity.runOnUiThread { startActivityForResult(invoke, intent, "accountQrResult") }
            } catch (e: Exception) {
                activity.runOnUiThread { invoke.fail(e.message ?: "Could not export the public keys") }
            }
        }
    }

    @Command
    fun registerMultisig(invoke: Invoke) {
        if (!engine.isLoaded) { invoke.fail("Load a seed first"); return }
        pendingScanMode = "multisig"
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", invoke, "cameraPermissionResult")
            return
        }
        startScanner(invoke)
    }

    @ActivityCallback
    private fun multisigScanResult(invoke: Invoke, result: androidx.activity.result.ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK) { invoke.fail("QR scan was cancelled"); return }
        val encoded = result.data?.getStringExtra(QrScanActivity.PAYLOAD)
        if (encoded == null) { invoke.fail("No multisig setup was received"); return }
        val kind = result.data?.getStringExtra(QrScanActivity.PAYLOAD_KIND) ?: "text"
        if (kind != "text" && kind != "bytes" && kind != "crypto-output") {
            invoke.fail("This QR code is not a multisig setup")
            return
        }
        worker.execute {
            try {
                val wallet = engine.registerMultisig(
                    android.util.Base64.decode(encoded, android.util.Base64.DEFAULT),
                    typedCbor = kind == "crypto-output",
                )
                activity.runOnUiThread { showMultisigReview(invoke, wallet) }
            } catch (e: Exception) {
                val message = if (e.message?.endsWith("WALLET") == true)
                    Design.tr("このマルチシグにこの鍵が含まれていないか、最初のアドレスが一致しません。パスフレーズを確かめてください。", "This wallet does not hold this seed's key, or its first address is not the one stated. Check the passphrase.")
                else e.message ?: "Could not read the multisig setup"
                activity.runOnUiThread { invoke.fail(message) }
            }
        }
    }

    // Registering decides what is shown as change, so the wallet is confirmed against the coordinator first
    private fun showMultisigReview(invoke: Invoke, wallet: wasmsigner.Multisig) {
        val keys = wallet.fingerprints.mapIndexed { i, fp -> "  $fp${if (i == wallet.ours) Design.tr("  ← この鍵", "  ← this seed") else ""}" }.joinToString("\n")
        Design.alert(activity).setTitle(Design.tr("マルチシグ ${wallet.threshold}/${wallet.fingerprints.size} を登録しますか", "Register ${wallet.threshold} of ${wallet.fingerprints.size} multisig?"))
            .setMessage(Design.tr("鍵\n$keys\n\n最初の受け取りアドレス\n${wallet.receive}\n\nコーディネーターに同じ最初の受け取りアドレスが表示されているか確かめてください。", "Keys\n$keys\n\nFirst receive address\n${wallet.receive}\n\nCheck that your coordinator shows the same first receive address."))
            .setPositiveButton(Design.tr("登録する", "Register")) { _, _ ->
                engine.keepMultisig(vault.enabled)
                invoke.resolve(stateObject())
            }
            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> engine.forgetMultisig(); invoke.fail("Registration was cancelled") }
            .setOnCancelListener { engine.forgetMultisig(); invoke.fail("Registration was cancelled") }
            .show()
    }

    @Command
    fun exportMultisig(invoke: Invoke) {
        val wallet = engine.multisig ?: run { invoke.fail("Register a multisig first"); return }
        showFrames(invoke, Design.tr("マルチシグ ${wallet.threshold}/${wallet.fingerprints.size}", "Multisig ${wallet.threshold} of ${wallet.fingerprints.size}"), Design.tr("見るだけのウォレットで読み取ると、マルチシグを取り込めます。", "Scan with a watch-only wallet to import the multisig.")) { engine.multisigUr() }
    }

    @Command
    fun forgetMultisig(invoke: Invoke) {
        engine.forgetMultisig()
        invoke.resolve(stateObject())
    }

    private fun exportAccountKey(invoke: Invoke, purpose: Int) {
        worker.execute {
            try {
                val contents = engine.accountQrContents(purpose)
                val title = "BIP$purpose"
                val intent = Intent(activity, SignedQrActivity::class.java)
                    .putStringArrayListExtra(SignedQrActivity.FRAMES, ArrayList(contents))
                    .putExtra("testnet", engine.testnet)
                    .putExtra("heading", title)
                    .putExtra("description", Design.tr("ウォレットアプリで読み取ってください。xpubとディスクリプターが自動で切り替わります。", "Scan with your wallet. The xpub and descriptor alternate automatically."))
                    .putExtra("interval", 1500L)
                    .putExtra("accountQr", true)
                activity.runOnUiThread { startActivityForResult(invoke, intent, "accountQrResult") }
            } catch (e: Exception) {
                activity.runOnUiThread { invoke.fail(e.message ?: "Could not export account information") }
            }
        }
    }

    @Command
    fun createMnemonic(invoke: Invoke) {
        restrictions.blockedBy()?.let { invoke.fail(restrictedMessage(it)); return }
        lateinit var flow: NewWallet
        fun show(mnemonic: CharArray) = activity.runOnUiThread {
            flow.close()
            showMnemonic(invoke, mnemonic, Design.tr("新しいウォレット", "New wallet"), true, verify = true)
        }
        fun failed(e: Exception, fallback: String) = activity.runOnUiThread { flow.close(); invoke.fail(e.message ?: fallback) }
        fun fromDice(rolls: ByteArray, words: Int) = worker.execute {
            origin = Origin(true, rolls.copyOf())
            try { show(engine.mnemonicFromDice(rolls, words)) } catch (e: Exception) { forget(null); failed(e, "Invalid dice rolls") }
        }
        flow = NewWallet(activity, engine.testnet,
            onRandom = { words ->
                worker.execute {
                    origin = Origin(false, null)
                    try { show(engine.mnemonicFromEntropy(ByteArray(words / 3 * 4).also(SecureRandom()::nextBytes))) }
                    catch (e: Exception) { failed(e, "Could not create a mnemonic") }
                }
            },
            onDice = { rolls, words, reset ->
                worker.execute {
                    val flags = try { engine.diceCheck(rolls, words) } catch (e: Exception) { 0 }
                    activity.runOnUiThread {
                        if ((flags and (DICE_BIASED or DICE_PATTERN)) == 0) fromDice(rolls, words)
                        else Design.alert(activity)
                            .setTitle(if ((flags and DICE_BIASED) != 0) Design.tr("出た目に偏りがあります", "The rolls are uneven") else Design.tr("出た目に規則性があります", "The rolls follow a pattern"))
                            .setMessage(Design.tr("公平なサイコロなら、ほとんど起きない並びです。目の押し間違いや、偏ったサイコロでないか確かめてください。振り直すことをおすすめします。",
                                "A fair die almost never gives rolls like these. Check for mistyped rolls or a weighted die. Rolling again is recommended."))
                            .setNegativeButton(Design.tr("このまま作る", "Use them anyway")) { _, _ -> fromDice(rolls, words) }
                            .setPositiveButton(Design.tr("振り直す", "Roll again")) { _, _ -> rolls.fill(0); reset() }
                            .setCancelable(false)
                            .create().also { d -> d.setOnShowListener { Design.styleDialog(d) } }.show()
                    }
                }
            },
            onCancel = { invoke.fail("Mnemonic creation was cancelled") })
        flow.show()
    }

    @Command
    fun bip85Mnemonic(invoke: Invoke) {
        if (!engine.isLoaded) { invoke.fail("Load a seed first"); return }
        val words = EditText(activity).apply {
            hint = Design.tr("単語の数(12、18、24)", "Words: 12, 18, or 24")
            setText("24")
            inputType = InputType.TYPE_CLASS_NUMBER
        }
        val index = EditText(activity).apply {
            hint = Design.tr("番号(BIP85のインデックス)", "BIP85 index")
            setText("0")
            inputType = InputType.TYPE_CLASS_NUMBER
        }
        val form = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(8), dp(24), 0)
            addView(words)
            addView(index)
        }
        val dialog = Design.alert(activity).setTitle(Design.tr("子ニーモニックを作る", "Derive a child mnemonic"))
            .setMessage(Design.tr("この鍵から、別のシードフレーズを作ります(m/83696968'/39'/0'/単語数'/番号')。", "Derived at m/83696968'/39'/0'/words'/index'."))
            .setView(form)
            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> invoke.fail("BIP85 derivation was cancelled") }
            .setOnCancelListener { invoke.fail("BIP85 derivation was cancelled") }
            .setPositiveButton(Design.tr("作る", "Show phrase"), null)
            .create()
        dialog.setOnShowListener {
            Design.styleDialog(dialog)
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val wordCount = words.text.toString().toIntOrNull()
                val childIndex = index.text.toString().toIntOrNull()
                if (wordCount == null || wordCount !in listOf(12, 18, 24) || childIndex == null || childIndex < 0) {
                    words.error = Design.tr("単語の数は12、18、24、番号は0以上にしてください", "Use 12, 18, or 24 words and a valid index")
                    return@setOnClickListener
                }
                dialog.dismiss()
                worker.execute {
                    try {
                        val mnemonic = engine.bip85Mnemonic(wordCount!!, childIndex)
                        activity.runOnUiThread { showMnemonic(invoke, mnemonic, Design.tr("子ニーモニック", "Child mnemonic"), wordCount in listOf(12, 24)) }
                    } catch (e: Exception) {
                        activity.runOnUiThread { invoke.fail(e.message ?: "Could not derive BIP85 mnemonic") }
                    }
                }
            }
        }
        dialog.show()
    }

    @Command
    fun findAddress(invoke: Invoke) {
        if (!engine.isLoaded) { invoke.fail("Load a seed first"); return }
        val address = EditText(activity).apply { hint = Design.tr("ビットコインのアドレスかbitcoin: URI", "Bitcoin address or bitcoin: URI") }
        val account = EditText(activity).apply {
            hint = Design.tr("アカウントの番号", "Account index")
            setText("0")
            inputType = InputType.TYPE_CLASS_NUMBER
        }
        val count = EditText(activity).apply {
            hint = Design.tr("調べるアドレスの数", "Addresses per chain")
            setText("1000")
            inputType = InputType.TYPE_CLASS_NUMBER
        }
        val form = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(8), dp(24), 0)
            addView(address)
            addView(account)
            addView(count)
        }
        val dialog = Design.alert(activity).setTitle(Design.tr("アドレスを確認する", "Check an address"))
            .setView(form)
            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> invoke.fail("Address search was cancelled") }
            .setOnCancelListener { invoke.fail("Address search was cancelled") }
            .setPositiveButton(Design.tr("調べる", "Search"), null)
            .create()
        dialog.setOnShowListener {
            Design.styleDialog(dialog)
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val accountValue = account.text.toString().toIntOrNull()
                val countValue = count.text.toString().toIntOrNull()
                if (address.text.isBlank() || accountValue == null || accountValue < 0 || countValue == null || countValue !in 1..100000) {
                    address.error = Design.tr("アドレス、アカウント、調べる数を入れてください", "Enter an address, account, and search range")
                    return@setOnClickListener
                }
                dialog.dismiss()
                worker.execute {
                    try {
                        val path = engine.findAddress(address.text.toString(), accountValue, countValue!!)
                        val result = path?.let { Design.tr("このウォレットのアドレスです。${if (it.chain == 0) "受け取り" else "おつり"}の${it.index}番目(アカウント $accountValue)。", "Found on the ${if (it.chain == 0) "receive" else "change"} chain at index ${it.index} (account $accountValue).") }
                            ?: Design.tr("受け取りとおつりの最初の${countValue}個には見つかりませんでした。", "Address not found in the first $countValue receive and change addresses.")
                        activity.runOnUiThread { showInfo(invoke, Design.tr("アドレスの確認", "Address search"), result) }
                    } catch (e: Exception) {
                        activity.runOnUiThread { invoke.fail(e.message ?: "Address search failed") }
                    }
                }
            }
        }
        dialog.show()
    }

    @Command
    fun signMessage(invoke: Invoke) {
        if (!engine.isLoaded) { invoke.fail("Load a seed first"); return }
        val message = EditText(activity).apply {
            hint = Design.tr("署名するメッセージ", "Message to sign")
            minLines = 3
            gravity = android.view.Gravity.TOP
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
        }
        val purpose = EditText(activity).apply { hint = Design.tr("種類(49、84)", "Purpose: 49 or 84"); setText("84"); inputType = InputType.TYPE_CLASS_NUMBER }
        val account = EditText(activity).apply { hint = Design.tr("アカウント", "Account"); setText("0"); inputType = InputType.TYPE_CLASS_NUMBER }
        val chain = EditText(activity).apply { hint = Design.tr("0は受け取り、1はおつり", "Chain: 0 receive, 1 change"); setText("0"); inputType = InputType.TYPE_CLASS_NUMBER }
        val index = EditText(activity).apply { hint = Design.tr("アドレスの番号", "Address index"); setText("0"); inputType = InputType.TYPE_CLASS_NUMBER }
        val form = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(8), dp(24), 0)
            addView(message)
            addView(purpose)
            addView(account)
            addView(chain)
            addView(index)
        }
        val dialog = Design.alert(activity).setTitle(Design.tr("メッセージに署名する", "Sign a message"))
            .setView(form)
            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> invoke.fail("Message signing was cancelled") }
            .setOnCancelListener { invoke.fail("Message signing was cancelled") }
            .setPositiveButton(Design.tr("確認する", "Review"), null)
            .create()
        dialog.setOnShowListener {
            Design.styleDialog(dialog)
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val purposeValue = purpose.text.toString().toIntOrNull()
                val accountValue = account.text.toString().toIntOrNull()
                val chainValue = chain.text.toString().toIntOrNull()
                val indexValue = index.text.toString().toIntOrNull()
                val messageValue = message.text.toString()
                if (messageValue.isEmpty() || purposeValue == null || purposeValue !in listOf(49, 84) || accountValue == null || accountValue < 0 || chainValue == null || chainValue !in 0..1 || indexValue == null || indexValue < 0) {
                    message.error = Design.tr("メッセージと、正しい番号を入れてください", "Enter a message and valid signing path")
                    return@setOnClickListener
                }
                dialog.dismiss()
                worker.execute {
                    try {
                        val review = engine.reviewMessage(messageValue.toByteArray(Charsets.UTF_8), purposeValue!!, accountValue, chainValue!!, indexValue)
                        activity.runOnUiThread { showMessageReview(invoke, purposeValue, accountValue, chainValue, indexValue, review) }
                    } catch (e: Exception) {
                        activity.runOnUiThread { invoke.fail(e.message ?: "Message review failed") }
                    }
                }
            }
        }
        dialog.show()
    }

    // The write-down step of a new wallet, and the result of BIP85; screenshots of it come out blank
    private fun showMnemonic(invoke: Invoke, phrase: CharArray, heading: String, seedQrAvailable: Boolean, verify: Boolean = false) {
        val p = Design.palette(activity)
        val tr = Design::tr
        val words = String(phrase).split(' ')
        val wordViews = mutableListOf<TextView>()
        // 24 words go in three columns so they fit a small phone without scrolling
        val columns = if (words.size > 12) 3 else 2
        val per = (words.size + columns - 1) / columns
        val list = LinearLayout(activity).apply {
            setPadding(dp(if (columns == 3) 8 else 16), dp(8), dp(8), dp(8))
            for (column in 0 until columns) addView(LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                for (i in column * per until minOf(words.size, column * per + per)) addView(LinearLayout(activity).apply {
                    gravity = Gravity.CENTER_VERTICAL
                    minimumHeight = dp(if (columns == 3) 32 else 40)
                    addView(Design.text(activity, "${i + 1}", Design.Style.CAPTION, p.inkMuted).apply { gravity = Gravity.END }, LinearLayout.LayoutParams(dp(20), -2))
                    addView(Design.text(activity, words[i], Design.Style.DATA, p.ink).apply {
                        textSize = if (columns == 3) 14f else 17f
                        setTypeface(typeface, Typeface.BOLD)
                        wordViews.add(this)
                    }, LinearLayout.LayoutParams(-2, -2).apply { marginStart = dp(if (columns == 3) 6 else 12) })
                })
            }, LinearLayout.LayoutParams(0, -2, 1f))
        }
        fun link(label: String) = Design.text(activity, label, Design.Style.LABEL, p.primary).apply { setPadding(0, dp(10), dp(20), dp(10)) }
        val seedQr = link(tr("SeedQRを表示", "Show SeedQR"))
        val content = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
            if (verify) addView(Design.steps(activity, p, 2), LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) })
            addView(Design.text(activity, tr("${words.size}個の単語を書き写す", "Write down your ${words.size} words"), Design.Style.DISPLAY, p.ink))
            addView(Design.text(activity, tr("紙に、この順番で書いてください。見た人はビットコインを持ち出せます。", "Write them on paper, in this order. Anyone who sees them can take your bitcoin."),
                Design.Style.BODY, p.inkMuted), LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(8) })
            addView(Design.card(activity, p).apply { addView(list) }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(16) })
            // SeedQR and the derivation are links, so the footer keeps one button and the words fit without scrolling
            val links = LinearLayout(activity).apply { if (seedQrAvailable) addView(seedQr) }
            addView(links, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(4) })
            origin?.takeIf { verify }?.let { made ->
                links.addView(link(tr("この単語のでき方", "How they were made")).apply {
                    setOnClickListener {
                        worker.execute {
                            val entropy = engine.mnemonicEntropy(phrase) ?: return@execute
                            activity.runOnUiThread {
                                showDerivation(activity, engine.testnet, words, engine.words, entropy, made.dice, origin?.rolls) { origin?.rolls?.fill(0); origin = Origin(made.dice, null) }
                            }
                        }
                    }
                })
            }
        }
        fun blank() = wordViews.forEach { it.text = "" }
        fun clearAndResolve(shown: Boolean) {
            blank()
            forget(phrase)
            invoke.resolve(JSObject().apply { put("shown", shown) })
        }
        val wrote = Design.button(activity, if (verify) tr("書き写しました", "I wrote them down") else tr("完了", "Done"), true, p)
        val dialog = Design.screen(activity, heading, engine.testnet, ScrollView(activity).apply { addView(content) }, listOf(wrote)) { clearAndResolve(false) }
        dialog.window?.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
        wrote.setOnClickListener {
            dialog.dismiss()
            if (verify) { blank(); checkBackup(invoke, phrase, heading, seedQrAvailable) } else clearAndResolve(false)
        }
        seedQr.setOnClickListener {
            blank()
            dialog.dismiss()
            choose(Design.tr("SeedQRの形式", "SeedQR format"), Design.tr("形式を選んでください", "Choose a format"),
                Design.tr("読み取るウォレットが対応している形式を選んでください。", "Pick the format your wallet can scan."),
                listOf(Design.tr("標準のSeedQR", "Standard SeedQR") to Design.tr("多くのウォレットが対応", "Works with most wallets"), "CompactSeedQR" to Design.tr("小さいQR・対応するウォレットのみ", "Smaller QR · supported wallets only")),
                { clearAndResolve(false) }) { which ->
                worker.execute {
                    try {
                        val payload = engine.seedQrFromMnemonic(phrase, compact = which == 1)
                        val intent = Intent(activity, SignedQrActivity::class.java)
                            .putExtra(SignedQrActivity.QR_BYTES, payload.copyOf())
                            .putExtra("testnet", engine.testnet)
                            .putExtra("binaryQr", which == 1)
                            .putExtra("secretQr", true)
                            .putExtra("heading", if (which == 1) "CompactSeedQR" else Design.tr("標準のSeedQR", "Standard SeedQR"))
                            .putExtra("description", Design.tr("対応するウォレットで読み取ってください。このQRは人に見せないでください。", "Scan this QR with a compatible wallet and keep it private."))
                            .putExtra("qrName", "SeedQR")
                        activity.runOnUiThread {
                            startActivityForResult(invoke, intent, "secretQrResult")
                            payload.fill(0)
                        }
                    } catch (e: Exception) {
                        forget(phrase)
                        activity.runOnUiThread { invoke.fail(e.message ?: "Could not encode the SeedQR") }
                    }
                }
            }
        }
        dialog.show()
    }

    // Five random positions against three decoys each, as coconut_vault asks before a seed is kept
    private fun checkBackup(invoke: Invoke, phrase: CharArray, heading: String, seedQrAvailable: Boolean) {
        val random = SecureRandom().asKotlinRandom()
        val words = String(phrase).split(' ')
        val positions = words.indices.shuffled(random).take(5)
        fun cancel() {
            forget(phrase)
            invoke.resolve(JSObject().apply { put("shown", false) })
        }
        fun ask(step: Int) {
            if (step == positions.size) { backupChecked(invoke, phrase); return }
            val answer = words[positions[step]]
            val options = (engine.words.filter { it != answer }.shuffled(random).take(3) + answer).shuffled(random)
            val p = Design.palette(activity)
            lateinit var dialog: android.app.Dialog
            val choices = options.map { option ->
                Design.button(activity, option, false, p).apply {
                    typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                    textSize = 17f
                    setOnClickListener {
                        if (option == answer) { dialog.dismiss(); ask(step + 1); return@setOnClickListener }
                        val wrong = Design.alert(activity).setTitle(Design.tr("${positions[step] + 1}番目の単語ではありません", "That is not word ${positions[step] + 1}"))
                            .setMessage(Design.tr("紙に書いた単語と見比べて、もう一度試してください。", "Compare your backup with the words and try again."))
                            .setPositiveButton(Design.tr("単語をもう一度見る", "Show the words")) { _, _ -> dialog.dismiss(); showMnemonic(invoke, phrase, heading, seedQrAvailable, verify = true) }
                            .setNegativeButton(Design.tr("選び直す", "Choose again"), null)
                            .create()
                        wrong.setOnShowListener { Design.styleDialog(wrong) }
                        wrong.show()
                    }
                }
            }
            val content = page(
                Design.text(activity, Design.tr("確認 ${step + 1} / ${positions.size}", "Check ${step + 1} of ${positions.size}"), Design.Style.OVERLINE, p.inkMuted),
                Design.text(activity, Design.tr("${positions[step] + 1}番目の単語はどれですか", "Which is word ${positions[step] + 1}?"), Design.Style.DISPLAY, p.ink),
                Design.text(activity, Design.tr("紙に書いた単語を見て選んでください。", "Look at your paper and choose it."), Design.Style.BODY, p.inkMuted),
                *choices.toTypedArray(),
            )
            dialog = Design.screen(activity, Design.tr("バックアップの確認", "Check your backup"), engine.testnet, content, emptyList()) { cancel() }
            dialog.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
            dialog.show()
        }
        ask(0)
    }

    // Ends a new wallet's flow: the words, and the rolls they came from, leave memory
    private fun forget(phrase: CharArray?) {
        phrase?.fill('\u0000')
        origin?.rolls?.fill(0)
        origin = null
    }

    private fun backupChecked(invoke: Invoke, phrase: CharArray) {
        fun done() {
            forget(phrase)
            invoke.resolve(stateObject().apply { put("shown", true) })
        }
        val dialog = Design.alert(activity).setTitle(Design.tr("バックアップを確かめました", "Backup checked"))
            .setMessage(Design.tr("このシードフレーズを、署名に使う鍵として今読み込みますか。", "Load these words as the signing key now?"))
            .setNegativeButton(Design.tr("完了", "Done")) { _, _ -> done() }
            .setPositiveButton(Design.tr("読み込む", "Load it")) { _, _ ->
                askPassphrase(Design.tr("パスフレーズ", "Mnemonic passphrase"), ::done) { passphrase ->
                    worker.execute {
                        try {
                            val entropy = if (vault.enabled) engine.mnemonicEntropy(phrase) else null
                            try { engine.loadMnemonic(phrase.copyOf(), passphrase) } catch (e: Exception) { entropy?.fill(0); throw e }
                            activity.runOnUiThread { offerSave(entropy) { done() } }
                        } catch (e: Exception) {
                            forget(phrase)
                            activity.runOnUiThread { invoke.fail(e.message ?: "Could not load the mnemonic") }
                        }
                    }
                }
            }
            .create()
        dialog.setOnCancelListener { done() }
        dialog.setOnShowListener {
            Design.styleDialog(dialog)
        }
        dialog.show()
    }

    private fun askPassphrase(title: String, onCancel: () -> Unit, onContinue: (CharArray) -> Unit) {
        val passphrase = EditText(activity).apply {
            hint = Design.tr("パスフレーズ(なくてもかまいません)", "Optional BIP39 passphrase")
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD or
                InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            keepFromKeyboard()
        }
        val dialog = Design.alert(activity).setTitle(title)
            .setMessage(Design.tr("パスフレーズを付けていない場合は、空のまま続けてください。", "Leave blank if this seed has no passphrase."))
            .setView(passphrase)
            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> onCancel() }
            .setPositiveButton(Design.tr("続ける", "Continue"), null)
            .create()
        dialog.setOnCancelListener { onCancel() }
        dialog.setOnShowListener {
            dialog.window?.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
            Design.styleDialog(dialog)
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val chars = passphrase.text.toString().toCharArray()
                passphrase.text.clear()
                dialog.dismiss()
                onContinue(chars)
            }
        }
        dialog.show()
    }

    private fun stateObject() = JSObject().apply {
        put("loaded", engine.isLoaded)
        put("multisig", engine.multisig?.let { "${it.threshold} of ${it.fingerprints.size}" } ?: "")
        put("fingerprint", engine.fingerprint)
        put("testnet", engine.testnet)
        put("storage", vault.enabled)
        put("deviceSecure", vault.deviceSecure)
        put("saved", vault.entries().size)
        put("restrictions", restrictions.json())
    }

    @Command
    fun setTheme(invoke: Invoke) {
        Design.theme = invoke.parseArgs(SetThemeArgs::class.java).theme
        invoke.resolve()
    }

    @Command
    fun setRestriction(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SetRestrictionArgs::class.java)
            restrictions.setLevel(args.id, args.level)
            if (restrictions.blockedBy() != null) engine.lock()
            invoke.resolve(stateObject())
        } catch (e: Exception) {
            invoke.fail(e.message ?: "Could not change the restriction")
        }
    }

    @Command
    fun setStorage(invoke: Invoke) {
        val enabled = invoke.parseArgs(SetStorageArgs::class.java).enabled
        when {
            enabled && !vault.deviceSecure -> invoke.fail("Set a screen lock on this device first")
            !enabled && vault.entries().isNotEmpty() -> confirmErase(invoke, turningOff = true)
            else -> {
                vault.enabled = enabled
                if (!enabled) engine.forgetSavedMultisigs()
                invoke.resolve(stateObject())
            }
        }
    }

    @Command
    fun unlockSaved(invoke: Invoke) {
        val entries = vault.entries()
        if (entries.isEmpty()) { invoke.fail("No seeds are saved on this device"); return }
        choose(Design.tr("保存した鍵", "Saved seeds"), Design.tr("開く鍵を選んでください", "Choose a seed to unlock"),
            Design.tr("開くときに、画面ロックか生体認証と、付けていればパスフレーズを入力します。", "Unlocking asks for your screen lock or biometrics, then the passphrase if the seed has one."),
            entries.map { it.name to Design.tr("フィンガープリント ${it.fingerprint}", "Fingerprint ${it.fingerprint}") },
            { invoke.fail("Unlock was cancelled") }) { chooseSaved(invoke, entries[it]) }
    }

    // A full-screen list of choices; back or the close button cancels
    private fun choose(heading: String, title: String, lead: String, options: List<Pair<String, String?>>, onCancel: () -> Unit, onPick: (Int) -> Unit) {
        val p = Design.palette(activity)
        val list = Design.card(activity, p)
        lateinit var dialog: android.app.Dialog
        options.forEachIndexed { i, (name, detail) ->
            if (i > 0) list.addView(Design.divider(activity, p), LinearLayout.LayoutParams(-1, dp(1)))
            list.addView(Design.row(activity, p, name, detail) {
                dialog.dismiss()
                onPick(i)
            })
        }
        val content = page(Design.text(activity, title, Design.Style.DISPLAY, p.ink), Design.text(activity, lead, Design.Style.BODY, p.inkMuted), list)
        dialog = Design.screen(activity, heading, engine.testnet, content, emptyList(), onCancel)
        dialog.show()
    }

    // A screen's body: views stacked with the app's gap, scrolling when they do not fit
    private fun page(vararg views: View) = ScrollView(activity).apply {
        addView(LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(24), dp(16), dp(24))
            views.forEachIndexed { i, view -> addView(view, LinearLayout.LayoutParams(-1, -2).apply { if (i > 0) topMargin = dp(DesignTokens.SPACE_4) }) }
        })
    }

    @Command
    fun eraseSaved(invoke: Invoke) = confirmErase(invoke, turningOff = false)

    // Switching to RAM only erases what is saved, so nothing stays behind that the setting says is not there
    private fun confirmErase(invoke: Invoke, turningOff: Boolean) {
        val count = vault.entries().size
        val cancelled = if (turningOff) "Key storage was left on" else "Erase was cancelled"
        Design.alert(activity).setTitle(if (turningOff) Design.tr("メモリのみに切り替えますか", "Switch to RAM only?") else Design.tr("保存した鍵をすべて消去しますか", "Erase every saved seed?"))
            .setMessage(if (turningOff) Design.tr("この端末に保存した${count}件の鍵を消去します。元に戻すには、バックアップが必要です。", "The $count saved seed${if (count == 1) "" else "s"} on this device will be erased. You need your backups to restore them.")
                        else Design.tr("この端末にある写しだけを消去します。元に戻すには、バックアップが必要です。", "Only the copies on this device are erased. You need your backups to restore them."))
            .setPositiveButton(if (turningOff) Design.tr("消去して切り替える", "Erase and switch") else Design.tr("消去する", "Erase")) { _, _ ->
                authenticate(Design.tr("保存した鍵を消去", "Erase saved seeds"), null, { invoke.fail(it) }) {
                    vault.eraseAll()
                    engine.forgetSavedMultisigs()
                    if (turningOff) vault.enabled = false
                    invoke.resolve(stateObject())
                }
            }
            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> invoke.fail(cancelled) }
            .setOnCancelListener { invoke.fail(cancelled) }
            .show()
    }

    // Back returns to the list, so a wrong choice is not a cancelled unlock
    private fun chooseSaved(invoke: Invoke, entry: KeyVault.Entry) {
        val p = Design.palette(activity)
        val unlock = Design.button(activity, Design.tr("開く", "Unlock"), true, p)
        val delete = Design.button(activity, Design.tr("この鍵を削除", "Delete this seed"), false, p).apply {
            setTextColor(p.danger)
            background = Design.shape(activity, p.surface, p.danger, DesignTokens.RADIUS_MD)
        }
        val content = page(
            Design.text(activity, entry.name, Design.Style.DISPLAY, p.ink),
            Design.card(activity, p).apply {
                addView(Design.field(activity, p, Design.tr("フィンガープリント", "FINGERPRINT"), Design.well(activity, p, entry.fingerprint, grouped = false),
                    Design.tr("ウォレットアプリに表示されるものと同じか確かめてください。", "Check it matches the one your wallet app shows.")))
            },
        )
        val dialog = Design.screen(activity, Design.tr("保存した鍵", "Saved seeds"), engine.testnet, content, listOf(unlock, delete)) { unlockSaved(invoke) }
        unlock.setOnClickListener {
            dialog.dismiss()
            authenticate(Design.tr("${entry.name}を開く", "Unlock ${entry.name}"), { vault.decryptCipher(entry) }, { invoke.fail(it) }) { cipher ->
                unlockWithPassphrase(invoke, entry, cipher!!.doFinal(entry.data))
            }
        }
        delete.setOnClickListener {
            val confirm = Design.alert(activity).setTitle(Design.tr("${entry.name}を削除しますか", "Delete ${entry.name}?"))
                .setMessage(Design.tr("この端末にある写しだけを削除します。元に戻すには、バックアップが必要です。", "Only the copy on this device is deleted. You need your backup to restore it."))
                .setPositiveButton(Design.tr("削除する", "Delete")) { _, _ ->
                    dialog.dismiss()
                    authenticate(Design.tr("${entry.name}を削除", "Delete ${entry.name}"), null, { invoke.fail(it) }) {
                        vault.delete(entry)
                        invoke.resolve(stateObject())
                    }
                }
                .setNegativeButton(Design.tr("キャンセル", "Cancel"), null)
                .create()
            confirm.setOnShowListener { Design.styleDialog(confirm) }
            confirm.show()
        }
        dialog.show()
    }

    private fun unlockWithPassphrase(invoke: Invoke, entry: KeyVault.Entry, entropy: ByteArray) {
        askPassphrase(Design.tr("${entry.name}のパスフレーズ", "Passphrase for ${entry.name}"), { entropy.fill(0); invoke.fail("Unlock was cancelled") }) { passphrase ->
            worker.execute {
                try {
                    engine.loadSeedQr(listOf("vault" to entropy.copyOf()), "saved seed", passphrase).fill(0)
                    val got = engine.fingerprint
                    if (got == entry.fingerprint) {
                        entropy.fill(0)
                        activity.runOnUiThread { invoke.resolve(stateObject()) }
                        return@execute
                    }
                    engine.lock()
                    activity.runOnUiThread {
                        Design.alert(activity).setTitle(Design.tr("フィンガープリントが一致しません", "Fingerprint does not match"))
                            .setMessage(Design.tr("保存した鍵は${entry.fingerprint}ですが、このパスフレーズでは${got}になります。パスフレーズを確かめてください。", "The saved seed is ${entry.fingerprint}, but this passphrase gives $got. Check the passphrase."))
                            .setPositiveButton(Design.tr("やり直す", "Try again")) { _, _ -> unlockWithPassphrase(invoke, entry, entropy) }
                            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> entropy.fill(0); invoke.fail("Unlock was cancelled") }
                            .setOnCancelListener { entropy.fill(0); invoke.fail("Unlock was cancelled") }
                            .show()
                    }
                } catch (e: Exception) {
                    entropy.fill(0)
                    activity.runOnUiThread { invoke.fail(e.message ?: "Could not unlock the seed") }
                }
            }
        }
    }

    // Called once a seed has loaded: offers to keep a 12 or 24 word seed when storage is on
    private fun offerSave(entropy: ByteArray?, done: (JSObject) -> Unit) {
        val fingerprint = engine.fingerprint
        if (entropy == null || fingerprint == null || !vault.enabled || !vault.deviceSecure) {
            entropy?.fill(0)
            done(stateObject())
            return
        }
        val name = EditText(activity).apply { hint = Design.tr("名前", "Name"); setText(Design.tr("鍵 $fingerprint", "Seed $fingerprint")) }
        val dialog = Design.alert(activity).setTitle(Design.tr("この鍵をこの端末に保存しますか", "Save this seed on this device?"))
            .setMessage(Design.tr("単語は、画面ロックか生体認証が必要な鍵で暗号化して保存します。パスフレーズは保存しません。", "The words are encrypted with a key that needs your screen lock or biometrics. The passphrase is not saved."))
            .setView(name)
            .setNegativeButton(Design.tr("今はしない", "Not now")) { _, _ -> entropy.fill(0); done(stateObject()) }
            .setPositiveButton(Design.tr("保存する", "Save"), null)
            .create()
        dialog.setOnCancelListener { entropy.fill(0); done(stateObject()) }
        dialog.setOnShowListener {
            Design.styleDialog(dialog)
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val label = name.text.toString().trim().ifEmpty { Design.tr("鍵 $fingerprint", "Seed $fingerprint") }
                val id = vault.newId()
                dialog.dismiss()
                authenticate(Design.tr("${label}を保存", "Save $label"), { vault.encryptCipher(id) }, { message ->
                    vault.discardKey(id)
                    entropy.fill(0)
                    Design.alert(activity).setTitle(Design.tr("鍵を保存できませんでした", "The seed was not saved")).setMessage(message)
                        .setPositiveButton("OK", null)
                        .setOnDismissListener { done(stateObject()) }
                        .show()
                }) { cipher ->
                    try {
                        vault.save(id, label, fingerprint, cipher!!, entropy)
                    } finally {
                        entropy.fill(0)
                    }
                    done(stateObject())
                }
            }
        }
        dialog.show()
    }

    // Android 11 binds each use of the key to this prompt; before it, the prompt opens the key's short window
    private fun authenticate(title: String, cipher: (() -> Cipher)?, onError: (String) -> Unit, onSuccess: (Cipher?) -> Unit) {
        val perUse = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
        val crypto = try {
            if (perUse) cipher?.invoke() else null
        } catch (e: Exception) {
            onError(vaultError(e))
            return
        }
        val info = BiometricPrompt.PromptInfo.Builder().setTitle(title)
            .setAllowedAuthenticators(
                if (perUse) Authenticators.BIOMETRIC_STRONG or Authenticators.DEVICE_CREDENTIAL
                else Authenticators.BIOMETRIC_WEAK or Authenticators.DEVICE_CREDENTIAL
            )
            .build()
        authenticating = true
        val prompt = BiometricPrompt(activity as AppCompatActivity, ContextCompat.getMainExecutor(activity), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                authenticating = false
                try {
                    onSuccess(if (perUse) result.cryptoObject?.cipher else cipher?.invoke())
                } catch (e: Exception) {
                    onError(vaultError(e))
                }
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                authenticating = false
                onError(errString.toString())
            }
        })
        if (crypto != null) prompt.authenticate(info, BiometricPrompt.CryptoObject(crypto)) else prompt.authenticate(info)
    }

    private fun vaultError(e: Exception) = if (e is KeyPermanentlyInvalidatedException)
        Design.tr("画面ロックか生体認証が変わったため、この保存した鍵はもう開けません。削除して、バックアップから戻してください。", "This saved seed can no longer be unlocked because the screen lock or biometrics changed. Delete it and restore from your backup.")
    else e.message ?: "The device key store refused the operation"

    private fun showMessageReview(
        invoke: Invoke,
        purpose: Int,
        account: Int,
        chain: Int,
        index: Int,
        review: wasmsigner.MessageReview,
    ) {
        val detail = Design.tr("アドレス", "Address") + "\n${review.address}\n\n" + Design.tr("パス", "Path") + "\nm/$purpose'/0'/$account'/$chain/$index\n\n" +
            (if (review.isHex) Design.tr("メッセージ(16進)", "Message bytes (hex)") else Design.tr("メッセージ", "Message")) + "\n${review.text}"
        val dialog = Design.alert(activity).setTitle(Design.tr("メッセージの確認", "Review message"))
            .setMessage(detail)
            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> invoke.fail("Message signing was cancelled") }
            .setPositiveButton(Design.tr("署名する", "Sign"), null)
            .create()
        dialog.setOnCancelListener { invoke.fail("Message signing was cancelled") }
        dialog.setOnShowListener {
            dialog.window?.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
            dialog.findViewById<TextView>(android.R.id.message)?.setTextIsSelectable(true)
            Design.styleDialog(dialog)
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                dialog.dismiss()
                worker.execute {
                    try {
                        val signature = engine.signMessage()
                        val encoded = android.util.Base64.encodeToString(signature, android.util.Base64.NO_WRAP)
                        signature.fill(0)
                        activity.runOnUiThread {
                            showInfo(invoke, Design.tr("署名(BIP137)", "BIP137 signature"), Design.tr("アドレス", "Address") + "\n${review.address}\n\nBase64\n$encoded")
                        }
                    } catch (e: Exception) {
                        activity.runOnUiThread { invoke.fail(e.message ?: "Message signing failed") }
                    }
                }
            }
        }
        dialog.show()
    }

    private fun showInfo(invoke: Invoke, title: String, detail: String) {
        val text = TextView(activity).apply {
            this.text = detail
            textSize = 14f
            typeface = Typeface.MONOSPACE
            setTextColor(Design.palette(activity).ink)
            setTextIsSelectable(true)
            setPadding(dp(24), dp(8), dp(24), dp(8))
        }
        val dialog = Design.alert(activity).setTitle(title).setView(ScrollView(activity).apply { addView(text) })
            .setPositiveButton(Design.tr("完了", "Done")) { _, _ -> invoke.resolve(JSObject().apply { put("shown", true) }) }
            .create()
        dialog.setOnCancelListener { invoke.resolve(JSObject().apply { put("shown", false) }) }
        dialog.setOnShowListener { Design.styleDialog(dialog) }
        dialog.show()
    }

    @ActivityCallback
    private fun secretQrResult(invoke: Invoke, result: androidx.activity.result.ActivityResult) {
        val response = JSObject()
        response.put("shown", result.resultCode == Activity.RESULT_OK)
        invoke.resolve(response)
    }

    @Command
    fun scanSeedQr(invoke: Invoke) {
        pendingScanMode = "seed"
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", invoke, "cameraPermissionResult")
            return
        }
        startSeedScanner(invoke)
    }

    @Command
    fun importMnemonic(invoke: Invoke) {
        MnemonicKeypad(activity, engine.testnet, engine.words, engine.wordEntry(), { invoke.fail("Seed import was cancelled") }) { mnemonic ->
            askPassphrase(Design.tr("パスフレーズ", "Mnemonic passphrase"), {
                mnemonic.fill('\u0000')
                invoke.fail("Seed import was cancelled")
            }) { passphrase ->
                worker.execute {
                    try {
                        val entropy = if (vault.enabled) engine.mnemonicEntropy(mnemonic) else null
                        try { engine.loadMnemonic(mnemonic, passphrase) } catch (e: Exception) { entropy?.fill(0); throw e }
                        activity.runOnUiThread { offerSave(entropy) { invoke.resolve(it) } }
                    } catch (e: Exception) {
                        activity.runOnUiThread { invoke.fail(e.message ?: "Could not load the mnemonic") }
                    }
                }
            }
        }.show()
    }

    @Command
    fun scanPsbt(invoke: Invoke) {
        if (!engine.isLoaded) { invoke.fail("Load a SeedQR first"); return }
        pendingScanMode = "psbt"
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", invoke, "cameraPermissionResult")
            return
        }
        startPsbtScanner(invoke)
    }

    @PermissionCallback
    private fun cameraPermissionResult(invoke: Invoke) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            startScanner(invoke)
        }
        else invoke.fail("Camera permission was denied")
    }

    private fun startScanner(invoke: Invoke) = when (pendingScanMode) {
        "psbt" -> startPsbtScanner(invoke)
        "multisig" -> startActivityForResult(invoke, Intent(activity, QrScanActivity::class.java).putExtra("mode", "multisig"), "multisigScanResult")
        else -> startSeedScanner(invoke)
    }

    private fun startSeedScanner(invoke: Invoke) {
        startActivityForResult(invoke, Intent(activity, QrScanActivity::class.java).putExtra("mode", "seed").putExtra("testnet", engine.testnet), "seedScanResult")
    }

    private fun startPsbtScanner(invoke: Invoke) {
        startActivityForResult(invoke, Intent(activity, QrScanActivity::class.java).putExtra("mode", "psbt").putExtra("testnet", engine.testnet), "psbtScanResult")
    }

    @ActivityCallback
    private fun seedScanResult(invoke: Invoke, result: androidx.activity.result.ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK) {
            invoke.fail("QR scan was cancelled")
            return
        }
        val data = result.data
        val candidates = buildList {
            data?.getByteArrayExtra(QrScanActivity.PAYLOAD_BYTES)?.let { add("rawBytes" to it) }
            data?.getByteArrayExtra(QrScanActivity.PAYLOAD_TEXT_BYTES)?.let { add("rawValue" to it) }
        }
        if (candidates.isEmpty()) {
            invoke.fail("No QR code was read")
            return
        }
        val scanInfo = data?.getStringExtra(QrScanActivity.SCAN_INFO) ?: "scanInfo unavailable"
        if (candidates.all { it.second.size == 64 }) {
            worker.execute {
                try {
                    engine.loadSeedQr(candidates, scanInfo).fill(0)
                    activity.runOnUiThread { invoke.resolve(stateObject()) }
                } catch (e: Exception) {
                    activity.runOnUiThread { invoke.fail(e.message ?: "Could not load the seed") }
                } finally {
                    candidates.forEach { it.second.fill(0) }
                }
            }
            return
        }
        askPassphrase(Design.tr("パスフレーズ", "SeedQR passphrase"), {
            candidates.forEach { it.second.fill(0) }
            invoke.fail("Seed import was cancelled")
        }) { passphraseChars ->
            worker.execute {
                try {
                    val payload = engine.loadSeedQr(candidates, scanInfo, passphraseChars)
                    val entropy = if (vault.enabled) engine.compactEntropy(payload) else null
                    payload.fill(0)
                    activity.runOnUiThread { offerSave(entropy) { invoke.resolve(it) } }
                } catch (e: Exception) {
                    activity.runOnUiThread { invoke.fail(e.message ?: "Could not load the SeedQR") }
                } finally {
                    passphraseChars.fill('\u0000')
                    candidates.forEach { it.second.fill(0) }
                }
            }
        }
    }

    @ActivityCallback
    private fun psbtScanResult(invoke: Invoke, result: androidx.activity.result.ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK) { invoke.fail("QR scan was cancelled"); return }
        val encoded = result.data?.getStringExtra(QrScanActivity.PAYLOAD)
        if (encoded == null) { invoke.fail("No PSBT was received"); return }
        worker.execute {
            try {
                val psbt = android.util.Base64.decode(encoded, android.util.Base64.DEFAULT)
                val review = engine.prepare(psbt)
                psbt.fill(0)
                activity.runOnUiThread { showReview(invoke, review) }
            } catch (e: Exception) {
                activity.runOnUiThread { invoke.fail(e.message ?: "Could not parse the PSBT") }
            }
        }
    }

    private fun showReview(invoke: Invoke, review: TransactionReview) {
        val p = Design.palette(activity)
        val tr = Design::tr
        fun cancel() { engine.cancelReview(); invoke.fail("Signing was cancelled") }
        fun line() = Design.divider(activity, p)
        val scroll = ScrollView(activity).apply { isFillViewport = true }
        val content = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(24), dp(16), dp(24))
        }
        fun add(view: View, gap: Int = DesignTokens.SPACE_6) =
            content.addView(view, LinearLayout.LayoutParams(-1, -2).apply { if (content.childCount > 0) topMargin = dp(gap) })
        add(Design.text(activity, tr("この取引に署名しますか", "Sign this transaction?"), Design.Style.DISPLAY, p.ink))
        add(Design.card(activity, p).apply {
            addView(Design.field(activity, p, tr("送る金額", "Amount sent"), Design.text(activity, "${btc(review.spend)} BTC", Design.Style.AMOUNT, p.accentInk)))
            addView(line(), LinearLayout.LayoutParams(-1, dp(1)))
            addView(Design.field(activity, p, tr("ネットワーク手数料", "Network fee"), Design.text(activity, "${btc(review.fee)} BTC", Design.Style.DATA, p.ink),
                tr("受取人ではなく、マイナーに支払われます。", "Paid to miners, not to the recipient.")))
            addView(line(), LinearLayout.LayoutParams(-1, dp(1)))
            addView(Design.field(activity, p, tr("署名する入力", "Inputs to sign"), Design.text(activity, tr("${review.signatures}件", "${review.signatures}"), Design.Style.DATA, p.ink),
                tr("入力の合計 ${btc(review.totalIn)} BTC", "Total input ${btc(review.totalIn)} BTC")))
        })
        add(Design.text(activity, tr("送り先とおつり・${review.outputs.size}件", "SEND TO AND CHANGE · ${review.outputs.size}"), Design.Style.OVERLINE, p.inkMuted))
        val checks = mutableListOf<CheckBox>()
        review.outputs.forEach { output ->
            val external = output.owner == "Send to"
            val label = when (output.owner) {
                "Send to" -> tr("送り先", "Send to")
                "Change" -> tr("おつり", "Change")
                else -> tr("このウォレットのアドレス", "This wallet")
            }
            val note = when {
                output.owner == "Change" -> tr("おつり。このウォレットに戻ります。", "Your change, back to this wallet.")
                !external -> tr("このウォレットのアドレスに送ります。", "Sent to an address of this wallet.")
                output.kind == "OP_RETURN" -> tr("OP_RETURNのデータ(16進)", "OP_RETURN data (hex)")
                output.kind != "ADDRESS" -> tr("スクリプト(16進)", "Script (hex)")
                else -> null
            }
            val value = LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                addView(Design.well(activity, p, output.text.ifBlank { tr("(なし)", "(none)") }, output.kind == "ADDRESS"))
                addView(Design.text(activity, "${btc(output.amount)} BTC", if (external) Design.Style.AMOUNT else Design.Style.DATA, if (external) p.accentInk else p.ink),
                    LinearLayout.LayoutParams(-2, -2).apply { topMargin = dp(DesignTokens.SPACE_2) })
                if (output.kind == "OP_RETURN" && output.amount > 0) addView(Design.text(activity,
                    tr("この金額は失われます。OP_RETURNの出力は使えません。", "This amount is burned: an OP_RETURN output can never be spent."), Design.Style.CAPTION, p.danger))
            }
            val check = Design.check(activity, if (output.kind == "ADDRESS") tr("このアドレスを確かめました", "I checked this address") else tr("この出力を確かめました", "I checked this output"), p)
            checks.add(check)
            add(Design.card(activity, p).apply {
                addView(Design.field(activity, p, "$label ${output.index}/${review.outputs.size}", value, note))
                addView(line(), LinearLayout.LayoutParams(-1, dp(1)))
                addView(check, LinearLayout.LayoutParams(-1, -2).apply { marginStart = dp(8) })
            }, DesignTokens.SPACE_3)
        }
        add(Design.text(activity, tr("署名すると、この内容で送金できるようになります。", "Once signed, this payment can be sent as shown."), Design.Style.BODY, p.ink))
        add(Design.text(activity, tr("すべての項目を確かめ、最後までスクロールすると署名できます。", "Check every item and scroll to the end to sign."), Design.Style.CAPTION, p.inkMuted), DesignTokens.SPACE_2)
        scroll.addView(content)
        val approve = Design.button(activity, tr("署名する", "Sign transaction"), true, p)
        val back = Design.button(activity, tr("キャンセル", "Cancel"), false, p)
        val dialog = Design.screen(activity, tr("署名の確認", "Review"), engine.testnet, scroll, listOf(back, approve), ::cancel)

        fun update() {
            val reachedEnd = scroll.height + scroll.scrollY >= content.height - dp(2)
            approve.isEnabled = reachedEnd && checks.isNotEmpty() && checks.all { it.isChecked }
            approve.alpha = if (approve.isEnabled) 1f else 0.45f
        }
        checks.forEach { it.setOnCheckedChangeListener { _, _ -> update() } }
        scroll.setOnScrollChangeListener { _: View, _: Int, _: Int, _: Int, _: Int -> update() }
        scroll.post { update() }
        back.setOnClickListener { dialog.dismiss(); cancel() }
        approve.setOnClickListener { dialog.dismiss(); showApproval(invoke) }
        dialog.window?.let(::protect)
        dialog.show()
    }

    private fun showApproval(invoke: Invoke) {
        val dialog = Design.alert(activity)
            .setTitle(Design.tr("署名してよいですか", "Sign it now?"))
            .setMessage(Design.tr("署名した取引は、ウォレットアプリで読み取るQRとして表示します。", "The signed transaction is shown as QR codes for your wallet app to scan."))
            .setNegativeButton(Design.tr("キャンセル", "Cancel")) { _, _ -> engine.cancelReview(); invoke.fail("Signing was cancelled") }
            .setPositiveButton(Design.tr("署名する", "Sign")) { _, _ ->
                worker.execute {
                    try {
                        val frames = engine.sign()
                        val intent = Intent(activity, SignedQrActivity::class.java)
                            .putStringArrayListExtra(SignedQrActivity.FRAMES, ArrayList(frames))
                            .putExtra("testnet", engine.testnet)
                        activity.runOnUiThread { startActivityForResult(invoke, intent, "signedQrResult") }
                    } catch (e: Exception) {
                        activity.runOnUiThread { invoke.fail(e.message ?: "Signing failed") }
                    }
                }
            }
            .setOnCancelListener { engine.cancelReview(); invoke.fail("Signing was cancelled") }
            .create()
        dialog.setOnShowListener {
            Design.styleDialog(dialog)
        }
        dialog.show()
    }

    @ActivityCallback
    private fun signedQrResult(invoke: Invoke, result: androidx.activity.result.ActivityResult) {
        val response = JSObject()
        response.put("signed", true)
        response.put("shown", result.resultCode == Activity.RESULT_OK)
        response.put("loaded", engine.isLoaded)
        response.put("fingerprint", engine.fingerprint)
        response.put("testnet", engine.testnet)
        invoke.resolve(response)
    }

    @ActivityCallback
    private fun accountQrResult(invoke: Invoke, result: androidx.activity.result.ActivityResult) {
        val response = JSObject()
        response.put("loaded", engine.isLoaded)
        response.put("fingerprint", engine.fingerprint)
        response.put("testnet", engine.testnet)
        response.put("shown", result.resultCode == Activity.RESULT_OK)
        invoke.resolve(response)
    }

    private fun btc(value: Long) = "%d.%08d".format(value / 100_000_000L, value % 100_000_000L)

    // A request only: keyboards may ignore it. Autofill services are kept out entirely
    private fun EditText.keepFromKeyboard() {
        imeOptions = imeOptions or EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING
        importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
    }

    private fun dp(value: Int) = (value * activity.resources.displayMetrics.density).toInt()

    // The worker outlives the activity for the same reason; only the key goes
    override fun onDestroy(activity: androidx.appcompat.app.AppCompatActivity) {
        worker.execute { engine.lock() }
    }
}
