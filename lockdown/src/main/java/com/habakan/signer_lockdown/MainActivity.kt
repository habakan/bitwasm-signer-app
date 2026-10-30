package com.habakan.signer_lockdown

import android.app.Activity
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInstaller
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.widget.Button
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.io.File
import java.security.MessageDigest

class MainActivity : Activity() {
    private lateinit var policy: Policy
    private lateinit var p: Palette
    private lateinit var stateBadge: TextView
    private lateinit var statusRows: LinearLayout
    private lateinit var restrictions: TextView
    private lateinit var note: TextView
    private lateinit var buttons: List<Button>
    private lateinit var forgetWifi: CheckBox
    private var afterConfirm: (() -> Unit)? = null

    private val installResult = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val ok = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1) == PackageInstaller.STATUS_SUCCESS
            val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
            toast(if (ok) tr("インストールしました。", "Installed") else tr("インストールできませんでした: ", "Not installed: ") + message)
            render()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        policy = Policy(this)
        val night = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        p = if (night) DesignTokens.dark else DesignTokens.light
        styleWindow(night)

        stateBadge = text("", 13f, bold = true)
        statusRows = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        restrictions = text("", 13f, mono = true).apply {
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = shape(p.surfaceSunken, radius = DesignTokens.RADIUS_SM)
        }
        note = text("", 13f, color = p.inkMuted)
        forgetWifi = CheckBox(this).apply {
            text = tr("制限を適用するときに保存済みの Wi-Fi を消す", "Forget saved Wi-Fi networks when applying")
            textSize = 15f
            setTextColor(p.ink)
            buttonTintList = ColorStateList(arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()), intArrayOf(p.primary, p.lineStrong))
            minHeight = dp(DesignTokens.CONTROL_HEIGHT)
            isChecked = true
        }
        buttons = listOf(
            button(tr("署名アプリを入れる", "Install the signer"), Kind.SECONDARY) { run(policy::installSigner) },
            button(tr("SD カードからアプリを更新", "Update an app from an SD card"), Kind.SECONDARY) { pickUpdate() },
            button(tr("PC から USB でアプリを更新", "Update an app from a PC over USB"), Kind.SECONDARY) { confirm(::usbUpdate) },
            button(tr("制限を適用", "Apply restrictions"), Kind.PRIMARY) { run { policy.apply(forgetWifi.isChecked) } },
            // Loosening needs the screen lock
            button(tr("制限を一時解除", "Lift restrictions"), Kind.SECONDARY) { confirm { run(policy::release) } },
            button(tr("Device Owner を外す", "Remove device owner"), Kind.DANGER) { confirm { run(policy::removeOwner) } },
        )

        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(24), dp(16), dp(24))
            addView(text(tr("状態", "Status"), 12f, bold = true, color = p.inkMuted).apply { letterSpacing = 0.06f })
            addView(card().apply { addView(statusRows) }, gap(8))
            addView(restrictions, gap(12))
            addView(note, gap(12))
            addView(text(tr("ロック", "Lock"), 12f, bold = true, color = p.inkMuted).apply { letterSpacing = 0.06f }, gap(24))
            addView(forgetWifi)
            buttons.forEach { addView(it, gap(12)) }
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(p.surface)
            addView(LinearLayout(context).apply {
                gravity = Gravity.CENTER_VERTICAL
                minimumHeight = dp(56)
                setPadding(dp(16), dp(8), dp(16), dp(8))
                setBackgroundColor(p.surfaceRaised)
                addView(text("Signer Lockdown", 17f, bold = true), LinearLayout.LayoutParams(0, -2, 1f))
                addView(stateBadge)
            })
            addView(View(context).apply { setBackgroundColor(p.line) }, LinearLayout.LayoutParams(-1, dp(1)))
            addView(ScrollView(context).apply { addView(body) }, LinearLayout.LayoutParams(-1, 0, 1f))
        }
        // From Android 15 the app draws behind the system bars
        if (Build.VERSION.SDK_INT >= 35) root.setOnApplyWindowInsetsListener { view, insets ->
            val bars = insets.getInsets(WindowInsets.Type.systemBars())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        setContentView(root)
        // Closes a transfer left open when this screen was recreated or the process was killed
        runCatching(policy::closeUsbTransfer)

        val filter = IntentFilter(Policy.INSTALL_RESULT)
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(installResult, filter, RECEIVER_NOT_EXPORTED)
        else registerReceiver(installResult, filter)
    }

    override fun onDestroy() {
        unregisterReceiver(installResult)
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    @Deprecated("Receives createConfirmDeviceCredentialIntent and ACTION_OPEN_DOCUMENT results")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (resultCode == RESULT_OK) {
            when (requestCode) {
                CONFIRM -> afterConfirm?.invoke()
                PICK_APK -> data?.data?.let(::confirmUpdate)
            }
        }
        afterConfirm = null
    }

    private enum class Kind { PRIMARY, SECONDARY, DANGER }

    // Drawn like the signer app's screens, from design/tokens.json
    private fun button(label: String, kind: Kind, onClick: () -> Unit) = Button(this).apply {
        text = label
        isAllCaps = false
        stateListAnimator = null
        textSize = 15f
        setTypeface(typeface, Typeface.BOLD)
        minHeight = dp(DesignTokens.CONTROL_HEIGHT)
        setTextColor(when (kind) { Kind.PRIMARY -> p.onPrimary; Kind.SECONDARY -> p.ink; Kind.DANGER -> p.danger })
        background = when (kind) {
            Kind.PRIMARY -> shape(p.primary, p.primary, DesignTokens.RADIUS_MD)
            Kind.SECONDARY -> shape(p.surfaceRaised, p.lineStrong, DesignTokens.RADIUS_MD)
            Kind.DANGER -> shape(p.surface, p.danger, DesignTokens.RADIUS_MD)
        }
        setOnClickListener { onClick() }
    }

    private fun text(value: String, size: Float, bold: Boolean = false, mono: Boolean = false, color: Int = p.ink) = TextView(this).apply {
        text = value
        textSize = size
        setTextColor(color)
        typeface = Typeface.create(if (mono) Typeface.MONOSPACE else Typeface.SANS_SERIF, if (bold) Typeface.BOLD else Typeface.NORMAL)
    }

    private fun card() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        background = shape(p.surfaceRaised, p.line)
        clipToOutline = true
    }

    private fun row(label: String, value: String) = LinearLayout(this).apply {
        gravity = Gravity.CENTER_VERTICAL
        minimumHeight = dp(DesignTokens.CONTROL_HEIGHT)
        setPadding(dp(16), dp(12), dp(16), dp(12))
        addView(text(label, 16f, bold = true), LinearLayout.LayoutParams(0, -2, 1f))
        addView(text(value, 14f, color = p.inkMuted))
    }

    private fun shape(fill: Int, stroke: Int? = null, radius: Int = DesignTokens.RADIUS_LG) = GradientDrawable().apply {
        setColor(fill)
        if (stroke != null) setStroke(dp(1), stroke)
        cornerRadius = dp(radius).toFloat()
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun gap(top: Int) = LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(top) }

    @Suppress("DEPRECATION")
    private fun styleWindow(night: Boolean) {
        window.statusBarColor = p.surfaceRaised
        window.navigationBarColor = p.surface
        if (!night) window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
    }

    private fun toast(message: String?) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    private fun run(action: () -> Unit) {
        runCatching(action).onFailure { toast(it.message) }
        render()
    }

    @Suppress("DEPRECATION")
    private fun confirm(action: () -> Unit) {
        val intent = getSystemService(KeyguardManager::class.java)
            .createConfirmDeviceCredentialIntent("Signer Lockdown", tr("制限を緩めます", "Loosen the restrictions"))
        if (intent == null) return action()
        afterConfirm = action
        startActivityForResult(intent, CONFIRM)
    }

    @Suppress("DEPRECATION")
    private fun pickUpdate() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType("application/vnd.android.package-archive")
        startActivityForResult(intent, PICK_APK)
    }

    private fun usbUpdate() {
        runCatching(policy::openUsbTransfer).onFailure { return toast(it.message) }
        val theme = if (p === DesignTokens.light) android.R.style.Theme_DeviceDefault_Light_Dialog_Alert else android.R.style.Theme_DeviceDefault_Dialog_Alert
        AlertDialog.Builder(this, theme)
            .setTitle(tr("PC から USB で更新", "Update from a PC over USB"))
            .setMessage(tr(
                "署名アプリを終了し、USB のファイル転送を許可しました。\n\n1. PC と USB ケーブルでつなぎ、通知から「ファイル転送」を選ぶ\n2. PC から APK を端末の Download にコピーする\n3. 「APK を選ぶ」を押す\n\nこの画面を閉じるとファイル転送は止まります。",
                "The signer was closed and USB file transfer is allowed.\n\n1. Connect a PC with a USB cable and pick File transfer in the notification\n2. Copy the APK from the PC to Download on the phone\n3. Tap Choose the APK\n\nFile transfer stops when this closes.",
            ))
            .setCancelable(false)
            .setPositiveButton(tr("APK を選ぶ", "Choose the APK")) { _, _ -> run(policy::closeUsbTransfer); pickUpdate() }
            .setNegativeButton(tr("やめる", "Cancel")) { _, _ -> run(policy::closeUsbTransfer) }
            .show()
            .getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(p.primary)
    }

    // Copies the chosen APK first, then shows its version and SHA-256 for a person to check against the release
    private fun confirmUpdate(uri: Uri) {
        val apk = File(cacheDir, "update.apk")
        contentResolver.openInputStream(uri)!!.use { input -> apk.outputStream().use { input.copyTo(it) } }
        val info = runCatching { policy.readUpdate(apk) }.getOrElse { return toast(it.message) }
        val sha256 = MessageDigest.getInstance("SHA-256").digest(apk.readBytes()).joinToString("") { "%02x".format(it) }
        val theme = if (p === DesignTokens.light) android.R.style.Theme_DeviceDefault_Light_Dialog_Alert else android.R.style.Theme_DeviceDefault_Dialog_Alert
        AlertDialog.Builder(this, theme)
            .setTitle(info.packageName)
            .setMessage("${policy.versionOf(info.packageName)} → ${info.versionName}\n\nSHA-256:\n$sha256\n\n" + tr("リリースページの SHA256SUMS と同じか確かめてください。", "Check it matches SHA256SUMS on the release page"))
            .setPositiveButton(tr("更新", "Update")) { _, _ -> run { policy.installUpdate(apk) } }
            .setNegativeButton(tr("やめる", "Cancel")) { _, _ -> apk.delete() }
            .show()
            .getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(p.primary)
    }

    private fun render() {
        buttons.forEach {
            it.isEnabled = policy.isDeviceOwner
            it.alpha = 1f
        }
        statusRows.removeAllViews()
        restrictions.visibility = View.GONE
        if (!policy.isDeviceOwner) {
            badge(tr("未設定", "Not set up"), p.dangerBg, p.danger)
            note.text = tr(
                "Device Owner ではありません。QR、導入ページ、install.sh のどれかで設定してください。",
                "Not the device owner. Set it up with the QR code, the installer page or install.sh.",
            )
            buttons.forEach { it.alpha = 0.45f }
            return
        }
        buttons[0].isEnabled = policy.hasBundledSigner && !policy.isSignerInstalled
        buttons[1].isEnabled = policy.isSignerInstalled
        buttons[2].isEnabled = policy.isSignerInstalled
        buttons.forEach { if (!it.isEnabled) it.alpha = 0.45f }

        val active = policy.activeRestrictions()
        val locked = active.size == Policy.RESTRICTIONS.size
        if (locked) badge(tr("ロック中", "Locked"), p.positiveBg, p.positive)
        else badge(tr("未ロック", "Not locked"), p.warningBg, p.warning)
        listOf(
            tr("署名アプリ", "Signer") to (policy.signerVersion ?: tr("未インストール", "Not installed")),
            tr("機内モード", "Airplane mode") to if (policy.isAirplaneModeOn) tr("オン", "On") else tr("オフ", "Off"),
            tr("保存済みの Wi-Fi", "Saved Wi-Fi networks") to "${policy.savedWifiCount}",
            tr("非表示のアプリ", "Hidden apps") to "${policy.hiddenCount()} / ${policy.hiddenPackages.size}",
            tr("制限", "Restrictions") to "${active.size} / ${Policy.RESTRICTIONS.size}",
        ).forEachIndexed { i, (label, value) ->
            if (i > 0) statusRows.addView(View(this).apply { setBackgroundColor(p.line) }, LinearLayout.LayoutParams(-1, dp(1)))
            statusRows.addView(row(label, value))
        }
        restrictions.visibility = View.VISIBLE
        restrictions.text = Policy.RESTRICTIONS.joinToString("\n") { "${if (it in active) "on " else "off"}  $it" }
        note.text = tr("USB デバッグは 設定 > 開発者向けオプション で手でオンに戻してください。", "Turn USB debugging back on yourself in Settings > Developer options.")
        note.visibility = if (active.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun badge(label: String, fill: Int, color: Int) = stateBadge.apply {
        text = label
        setTextColor(color)
        setPadding(dp(10), dp(4), dp(10), dp(4))
        background = shape(fill, radius = DesignTokens.RADIUS_FULL)
    }

    companion object {
        private const val CONFIRM = 1
        private const val PICK_APK = 2
    }
}
