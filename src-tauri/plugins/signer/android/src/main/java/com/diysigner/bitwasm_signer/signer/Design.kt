package com.diysigner.bitwasm_signer.signer

import android.app.Activity
import android.app.Dialog
import android.content.Context
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.view.Gravity
import android.view.View
import android.view.Window
import android.widget.Button
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import app.tauri.plugin.Invoke
import androidx.core.view.WindowCompat
import java.util.Locale

// Native screens built from design/tokens.json, in the language and theme the web view uses
internal object Design {
    // "system", "light" or "dark", sent by the web view's Settings
    @Volatile var theme = "system"

    val japanese get() = Locale.getDefault().language == "ja"
    fun tr(ja: String, en: String) = if (japanese) ja else en

    // Messages the web view shows when a native step stops; others, such as wasm errors, pass through as they are
    private val messages = mapOf(
        "Unlock was cancelled" to "鍵を開くのをやめました。",
        "Mnemonic creation was cancelled" to "新しいウォレットの作成をやめました。",
        "Message signing was cancelled" to "メッセージへの署名をやめました。",
        "Account export was cancelled" to "ウォレットアプリとの接続をやめました。",
        "Signing was cancelled" to "署名をやめました。",
        "Seed import was cancelled" to "鍵の読み込みをやめました。",
        "QR scan was cancelled" to "QRの読み取りをやめました。",
        "Registration was cancelled" to "マルチシグの登録をやめました。",
        "Dice entry was cancelled" to "サイコロの入力をやめました。",
        "Deletion was cancelled" to "削除をやめました。",
        "BIP85 derivation was cancelled" to "子ニーモニックの作成をやめました。",
        "Address search was cancelled" to "アドレスの確認をやめました。",
        "Erase was cancelled" to "消去をやめました。",
        "Key storage was left on" to "鍵の保存はオンのままです。",
        "Load a seed first" to "先に鍵を読み込んでください。",
        "Load a SeedQR first" to "先に鍵を読み込んでください。",
        "Register a multisig first" to "先にマルチシグを登録してください。",
        "No seeds are saved on this device" to "この端末に保存した鍵はありません。",
        "Set a screen lock on this device first" to "先にこのスマホに画面ロックを設定してください。",
        "Camera permission was denied" to "カメラの利用が許可されていません。",
        "This QR code is not a multisig setup" to "このQRはマルチシグの設定ではありません。",
        "No QR code was read" to "QRを読み取れませんでした。",
        "No PSBT was received" to "取引を受け取れませんでした。",
        "No multisig setup was received" to "マルチシグの設定を受け取れませんでした。",
        "Could not parse the PSBT" to "取引を読み取れませんでした。",
        "Could not read the multisig setup" to "マルチシグの設定を読み取れませんでした。",
        "Could not load the mnemonic" to "シードフレーズを読み込めませんでした。",
        "Could not load the SeedQR" to "SeedQRを読み込めませんでした。",
        "Could not load the seed" to "鍵を読み込めませんでした。",
        "Could not unlock the seed" to "鍵を開けませんでした。",
        "Could not create a mnemonic" to "シードフレーズを作れませんでした。",
        "Could not derive BIP85 mnemonic" to "子ニーモニックを作れませんでした。",
        "Could not encode the SeedQR" to "SeedQRを作れませんでした。",
        "Could not export the public keys" to "公開鍵を書き出せませんでした。",
        "Could not export account information" to "公開鍵を書き出せませんでした。",
        "Could not change the network" to "ネットワークを切り替えられませんでした。",
        "Could not change the restriction" to "端末の機能制限を変更できませんでした。",
        "Invalid dice rolls" to "サイコロの目が正しくありません。",
        "Signing failed" to "署名できませんでした。",
        "Message signing failed" to "メッセージに署名できませんでした。",
        "Message review failed" to "メッセージを確認できませんでした。",
        "Address search failed" to "アドレスを確認できませんでした。",
        "The device key store refused the operation" to "端末の鍵の保管庫が操作を受け付けませんでした。",
    )

    fun Invoke.fail(message: String) = reject(if (japanese) messages[message] ?: message else message)

    fun palette(context: Context): Palette {
        val night = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        return if (theme == "dark" || (theme == "system" && night)) DesignTokens.dark else DesignTokens.light
    }

    fun styleWindow(window: Window, p: Palette) {
        window.statusBarColor = p.surfaceRaised
        window.navigationBarColor = p.surface
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = p === DesignTokens.light
            isAppearanceLightNavigationBars = p === DesignTokens.light
        }
    }

    // The bar at the top of every screen: back, title and the network
    fun topBar(context: Context, p: Palette, title: String, testnet: Boolean, onBack: (() -> Unit)? = null) = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        addView(LinearLayout(context).apply {
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(context, 56)
            setBackgroundColor(p.surfaceRaised)
            setPadding(dp(context, if (onBack == null) 16 else 4), dp(context, 8), dp(context, 16), dp(context, 8))
            if (onBack != null) addView(text(context, "‹", Style.DISPLAY, p.ink).apply {
                gravity = Gravity.CENTER
                contentDescription = tr("戻る", "Back")
                isFocusable = true
                setOnClickListener { onBack() }
            }, LinearLayout.LayoutParams(dp(context, 44), dp(context, 44)))
            addView(text(context, title, Style.HEADING, p.ink), LinearLayout.LayoutParams(0, -2, 1f))
            addView(if (testnet) pill(context, tr("テストネット", "Testnet"), p.surfaceSunken, p.ink) else pill(context, tr("メインネット", "Mainnet"), p.accent, p.onAccent))
        })
        addView(divider(context, p), LinearLayout.LayoutParams(-1, dp(context, 1)))
    }

    // A full-screen step: top bar, the content and the actions pinned within thumb reach. Back cancels it
    fun screen(activity: Activity, title: String, testnet: Boolean, content: View, actions: List<View>, onCancel: () -> Unit): Dialog {
        val p = palette(activity)
        val dialog = Dialog(activity, android.R.style.Theme_Material_Light_NoActionBar)
        dialog.setContentView(LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(p.surface)
            addView(topBar(activity, p, title, testnet) { dialog.cancel() })
            addView(content, LinearLayout.LayoutParams(-1, 0, 1f))
            if (actions.isNotEmpty()) addView(divider(activity, p), LinearLayout.LayoutParams(-1, dp(activity, 1)))
            if (actions.isNotEmpty()) addView(LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(activity, 16), dp(activity, 12), dp(activity, 16), dp(activity, 12))
                actions.forEachIndexed { i, view -> addView(view, LinearLayout.LayoutParams(-1, -2).apply { if (i > 0) topMargin = dp(activity, DesignTokens.SPACE_3) }) }
            })
        })
        dialog.setOnCancelListener { onCancel() }
        dialog.window?.let { window ->
            window.setLayout(-1, -1)
            styleWindow(window, p)
        }
        return dialog
    }

    // The dialog's own text and list colors follow the chosen theme, not the system one
    fun alert(context: Context) = AlertDialog.Builder(context,
        if (palette(context) === DesignTokens.light) androidx.appcompat.R.style.Theme_AppCompat_Light_Dialog_Alert else androidx.appcompat.R.style.Theme_AppCompat_Dialog_Alert)

    // Call from setOnShowListener, once the dialog's views exist
    fun styleDialog(dialog: AlertDialog) {
        val p = palette(dialog.context)
        dialog.window?.setBackgroundDrawable(shape(dialog.context, p.surfaceRaised, p.line))
        dialog.findViewById<TextView>(androidx.appcompat.R.id.alertTitle)?.setTextColor(p.ink)
        dialog.findViewById<TextView>(android.R.id.message)?.setTextColor(p.inkMuted)
        dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.setTextColor(p.primary)
        dialog.getButton(AlertDialog.BUTTON_NEGATIVE)?.setTextColor(p.inkMuted)
        dialog.getButton(AlertDialog.BUTTON_NEUTRAL)?.setTextColor(p.inkMuted)
    }

    fun dp(context: Context, value: Int) = (value * context.resources.displayMetrics.density).toInt()

    fun shape(context: Context, fill: Int, stroke: Int? = null, radius: Int = DesignTokens.RADIUS_LG) = GradientDrawable().apply {
        setColor(fill)
        if (stroke != null) setStroke(dp(context, 1), stroke)
        cornerRadius = dp(context, radius).toFloat()
    }

    enum class Style(val size: Float, val bold: Boolean, val mono: Boolean = false) {
        DISPLAY(28f, true), HEADING(17f, true), BODY(16f, false), LABEL(15f, true),
        CAPTION(13f, false), OVERLINE(12f, true), DATA(15f, false, true), AMOUNT(24f, true, true),
    }

    fun text(context: Context, value: CharSequence, style: Style, color: Int) = TextView(context).apply {
        text = value
        textSize = style.size
        setTextColor(color)
        typeface = Typeface.create(if (style.mono) Typeface.MONOSPACE else Typeface.SANS_SERIF, if (style.bold) Typeface.BOLD else Typeface.NORMAL)
        if (style == Style.OVERLINE) letterSpacing = 0.06f
        if (style == Style.BODY) setLineSpacing(0f, 1.5f)
    }

    fun button(context: Context, label: String, primary: Boolean, p: Palette) = Button(context).apply {
        text = label
        isAllCaps = false
        stateListAnimator = null
        textSize = Style.LABEL.size
        setTypeface(typeface, Typeface.BOLD)
        minHeight = dp(context, DesignTokens.CONTROL_HEIGHT)
        setTextColor(if (primary) p.onPrimary else p.ink)
        background = shape(context, if (primary) p.primary else p.surfaceRaised, if (primary) p.primary else p.lineStrong, DesignTokens.RADIUS_MD)
    }

    fun card(context: Context, p: Palette) = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        background = shape(context, p.surfaceRaised, p.line)
        clipToOutline = true
    }

    // One labelled value inside a card; addresses go in a sunken well in groups of four so they can be read aloud
    fun field(context: Context, p: Palette, label: String, value: View, note: String? = null) = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        val pad = dp(context, DesignTokens.SPACE_4)
        setPadding(pad, pad, pad, pad)
        addView(text(context, label, Style.OVERLINE, p.inkMuted))
        addView(value, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(context, DesignTokens.SPACE_2) })
        if (note != null) addView(text(context, note, Style.CAPTION, p.inkMuted), LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(context, DesignTokens.SPACE_2) })
    }

    fun well(context: Context, p: Palette, value: String, grouped: Boolean) =
        text(context, if (grouped) value.chunked(4).joinToString(" ") else value, Style.DATA, p.ink).apply {
            val pad = dp(context, DesignTokens.SPACE_3)
            setPadding(pad, pad, pad, pad)
            background = shape(context, p.surfaceSunken, radius = DesignTokens.RADIUS_SM)
            setTextIsSelectable(true)
        }

    // Where a new wallet is among its three steps: one bar a step, filled up to this one, and its name
    private val STEPS = listOf("単語を作る" to "Make the words", "書き写す" to "Write them down", "確かめる" to "Check them")

    fun steps(context: Context, p: Palette, current: Int) = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        addView(LinearLayout(context).apply {
            for (i in 1..STEPS.size) addView(View(context).apply { background = shape(context, if (i <= current) p.primary else p.line, radius = DesignTokens.RADIUS_FULL) },
                LinearLayout.LayoutParams(0, dp(context, 4), 1f).apply { if (i > 1) marginStart = dp(context, 4) })
        })
        val (ja, en) = STEPS[current - 1]
        addView(text(context, tr("$current / ${STEPS.size}  $ja", "$current of ${STEPS.size}  $en"), Style.OVERLINE, p.inkMuted), LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(context, 6) })
    }

    // A tappable row of a card, like the web view's: a title, a detail line and a chevron
    fun row(context: Context, p: Palette, title: String, detail: String?, onTap: () -> Unit) = LinearLayout(context).apply {
        gravity = Gravity.CENTER_VERTICAL
        minimumHeight = dp(context, DesignTokens.CONTROL_HEIGHT)
        setPadding(dp(context, 16), dp(context, 12), dp(context, 16), dp(context, 12))
        addView(LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(text(context, title, Style.LABEL, p.ink))
            if (detail != null) addView(text(context, detail, Style.CAPTION, p.inkMuted))
        }, LinearLayout.LayoutParams(0, -2, 1f))
        addView(text(context, "›", Style.DISPLAY, p.inkMuted))
        foreground = RippleDrawable(ColorStateList.valueOf(p.primarySoft), null, null)
        isClickable = true
        setOnClickListener { onTap() }
    }

    fun divider(context: Context, p: Palette) = View(context).apply { setBackgroundColor(p.line) }

    fun pill(context: Context, label: String, fill: Int, color: Int) = text(context, label, Style.CAPTION, color).apply {
        setTypeface(typeface, Typeface.BOLD)
        setPadding(dp(context, 10), dp(context, 4), dp(context, 10), dp(context, 4))
        background = shape(context, fill, radius = DesignTokens.RADIUS_FULL)
        gravity = Gravity.CENTER
    }

    fun check(context: Context, label: String, p: Palette) = CheckBox(context).apply {
        text = label
        textSize = Style.LABEL.size
        setTextColor(p.ink)
        buttonTintList = ColorStateList(arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()), intArrayOf(p.primary, p.lineStrong))
        minHeight = dp(context, DesignTokens.CONTROL_HEIGHT)
    }
}
