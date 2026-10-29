package com.habakan.signer_lockdown

import android.app.Activity
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.os.Bundle
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
    private lateinit var status: TextView
    private lateinit var buttons: List<Button>
    private lateinit var forgetWifi: CheckBox
    private var afterConfirm: (() -> Unit)? = null

    private val installResult = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val ok = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1) == PackageInstaller.STATUS_SUCCESS
            val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
            toast(if (ok) tr("インストールした", "Installed") else tr("インストールできなかった: ", "Not installed: ") + message)
            render()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        policy = Policy(this)
        status = TextView(this)
        forgetWifi = CheckBox(this).apply {
            text = tr("制限を適用するときに保存済み Wi-Fi を消す", "Forget saved Wi-Fi networks when applying")
            isChecked = true
        }
        buttons = listOf(
            button(tr("署名アプリを入れる", "Install the signer")) { run(policy::installSigner) },
            button(tr("アプリを更新（SD カードから）", "Update an app (from an SD card)")) { pickUpdate() },
            button(tr("制限を適用", "Apply restrictions")) { run { policy.apply(forgetWifi.isChecked) } },
            // Loosening needs the screen lock
            button(tr("一時解除", "Lift restrictions")) { confirm { run(policy::release) } },
            button(tr("Device Owner を外す", "Remove device owner")) { confirm { run(policy::removeOwner) } },
        )
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
            addView(forgetWifi)
            buttons.forEach(::addView)
            addView(status)
        }
        setContentView(ScrollView(this).apply { addView(layout) })

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

    private fun button(label: String, onClick: () -> Unit) =
        Button(this).apply {
            text = label
            setOnClickListener { onClick() }
        }

    private fun toast(message: String?) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    private fun run(action: () -> Unit) {
        runCatching(action).onFailure { toast(it.message) }
        render()
    }

    @Suppress("DEPRECATION")
    private fun confirm(action: () -> Unit) {
        val intent = getSystemService(KeyguardManager::class.java)
            .createConfirmDeviceCredentialIntent("Signer Lockdown", tr("制限を緩める", "Loosen the restrictions"))
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

    // Copies the chosen APK first, then shows its version and SHA-256 for a person to check against the release
    private fun confirmUpdate(uri: Uri) {
        val apk = File(cacheDir, "update.apk")
        contentResolver.openInputStream(uri)!!.use { input -> apk.outputStream().use { input.copyTo(it) } }
        val info = runCatching { policy.readUpdate(apk) }.getOrElse { return toast(it.message) }
        val sha256 = MessageDigest.getInstance("SHA-256").digest(apk.readBytes()).joinToString("") { "%02x".format(it) }
        val check = tr("リリースページの SHA256SUMS と同じか確かめる", "Check it matches SHA256SUMS on the release page")
        AlertDialog.Builder(this)
            .setTitle(info.packageName)
            .setMessage("${policy.versionOf(info.packageName)} → ${info.versionName}\n\nSHA-256:\n$sha256\n\n$check")
            .setPositiveButton(tr("更新", "Update")) { _, _ -> run { policy.installUpdate(apk) } }
            .setNegativeButton(tr("やめる", "Cancel")) { _, _ -> apk.delete() }
            .show()
    }

    private fun render() {
        buttons.forEach { it.isEnabled = policy.isDeviceOwner }
        if (!policy.isDeviceOwner) {
            status.text = tr(
                "Device Owner ではない。QR か install.sh から設定する。",
                "Not the device owner. Set it up with the QR code or install.sh.",
            )
            return
        }
        buttons[0].isEnabled = policy.hasBundledSigner && !policy.isSignerInstalled
        buttons[1].isEnabled = policy.isSignerInstalled
        val active = policy.activeRestrictions()
        val on = tr("オン", "on")
        val off = tr("オフ", "off")
        status.text = buildString {
            appendLine(tr("署名アプリ", "Signer") + ": " + (policy.signerVersion ?: tr("入っていない", "not installed")))
            appendLine(tr("機内モード", "Airplane mode") + ": " + if (policy.isAirplaneModeOn) on else off)
            appendLine(tr("保存済み Wi-Fi", "Saved Wi-Fi networks") + ": ${policy.savedWifiCount}")
            appendLine(tr("非表示のアプリ", "Hidden apps") + ": ${policy.hiddenCount()} / ${policy.hiddenPackages.size}")
            appendLine(tr("制限", "Restrictions") + ": ${active.size} / ${Policy.RESTRICTIONS.size}")
            Policy.RESTRICTIONS.forEach { appendLine("${if (it in active) "on " else "off"}  $it") }
            if (active.isEmpty()) {
                appendLine()
                appendLine(tr(
                    "USB デバッグは 設定 > 開発者向けオプション で手でオンに戻す",
                    "Turn USB debugging back on yourself in Settings > Developer options",
                ))
            }
        }
    }

    companion object {
        private const val CONFIRM = 1
        private const val PICK_APK = 2
    }
}
