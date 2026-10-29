package com.habakan.signer_lockdown

import android.Manifest
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiManager
import android.os.Build
import android.os.UserManager
import android.provider.Settings
import java.io.File
import java.io.InputStream

// What a dedicated signer phone is locked to. release lifts the restrictions, but settings the OS turned
// off when they were applied (USB debugging, other apps' install permission, voice input IME) stay off
class Policy(private val context: Context) {
    private val dpm = context.getSystemService(DevicePolicyManager::class.java)
    private val admin = ComponentName(context, AdminReceiver::class.java)

    val isDeviceOwner get() = dpm.isDeviceOwnerApp(context.packageName)

    val isAirplaneModeOn
        get() = Settings.Global.getInt(context.contentResolver, Settings.Global.AIRPLANE_MODE_ON, 0) == 1

    val hiddenPackages: List<String> by lazy {
        runCatching { context.assets.open("hide.txt").bufferedReader().readLines() }
            .getOrDefault(emptyList())
            .map { it.trim() }
            .filter { it.isNotEmpty() && !it.startsWith("#") }
    }

    val hasBundledSigner get() = context.assets.list("")!!.contains(SIGNER_APK)

    fun versionOf(pkg: String): String? =
        runCatching { context.packageManager.getPackageInfo(pkg, 0).versionName }.getOrNull()

    val signerVersion get() = versionOf(SIGNER)

    val isSignerInstalled get() = signerVersion != null

    fun installSigner() = install { context.assets.open(SIGNER_APK) }

    // Android refuses an APK signed with another key or an older version, so only the package is checked here
    fun readUpdate(apk: File): PackageInfo {
        val info = context.packageManager.getPackageArchiveInfo(apk.path, 0)
        check(info?.packageName in setOf(SIGNER, context.packageName)) { "Not an APK of the signer or of Lockdown" }
        return info!!
    }

    fun installUpdate(apk: File) {
        install { apk.inputStream() }
        apk.delete()
    }

    // A device owner installs without asking the user. The result arrives as an INSTALL_RESULT broadcast
    private fun install(open: () -> InputStream) {
        val installer = context.packageManager.packageInstaller
        val id = installer.createSession(PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL))
        installer.openSession(id).use { session ->
            session.openWrite(SIGNER_APK, 0, -1).use { out ->
                open().use { it.copyTo(out) }
                session.fsync(out)
            }
            val done = Intent(INSTALL_RESULT).setPackage(context.packageName)
            // Mutable so the installer can put the result in the extras
            val flags = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
            session.commit(PendingIntent.getBroadcast(context, id, done, flags).intentSender)
        }
    }

    fun activeRestrictions(): List<String> {
        val active = dpm.getUserRestrictions(admin)
        return RESTRICTIONS.filter { active.getBoolean(it) }
    }

    fun hiddenCount() = hiddenPackages.count { dpm.isApplicationHidden(admin, it) }

    // Only a device owner can see and remove Wi-Fi networks saved by others. Listing them needs location permission
    @Suppress("DEPRECATION")
    private fun savedNetworks(): List<WifiConfiguration> {
        dpm.setPermissionGrantState(
            admin, context.packageName, Manifest.permission.ACCESS_FINE_LOCATION,
            DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED,
        )
        return context.getSystemService(WifiManager::class.java).configuredNetworks ?: emptyList()
    }

    val savedWifiCount get() = savedNetworks().size

    fun apply(forgetWifi: Boolean) {
        // DISALLOW_AIRPLANE_MODE freezes the current state, so applying it with airplane mode off keeps the radios on
        check(isAirplaneModeOn) { "Turn on airplane mode first" }
        if (forgetWifi) {
            val wifi = context.getSystemService(WifiManager::class.java)
            savedNetworks().forEach { wifi.removeNetwork(it.networkId) }
        }
        RESTRICTIONS.forEach { dpm.addUserRestriction(admin, it) }
        dpm.setPermittedAccessibilityServices(admin, emptyList())
        dpm.setPermittedInputMethods(admin, emptyList())
        dpm.setUninstallBlocked(admin, SIGNER, true)
        hiddenPackages.forEach { dpm.setApplicationHidden(admin, it, true) }
    }

    fun release() {
        RESTRICTIONS.forEach { dpm.clearUserRestriction(admin, it) }
        dpm.setPermittedAccessibilityServices(admin, null)
        dpm.setPermittedInputMethods(admin, null)
        dpm.setUninstallBlocked(admin, SIGNER, false)
        hiddenPackages.forEach { dpm.setApplicationHidden(admin, it, false) }
    }

    fun removeOwner() {
        release()
        dpm.clearDeviceOwnerApp(context.packageName)
    }

    companion object {
        const val SIGNER = "com.habakan.bitwasm_signer"
        const val SIGNER_APK = "bitwasm-signer.apk"
        const val INSTALL_RESULT = "com.habakan.signer_lockdown.INSTALL_RESULT"

        val RESTRICTIONS = listOf(
            UserManager.DISALLOW_AIRPLANE_MODE,
            UserManager.DISALLOW_BLUETOOTH,
            UserManager.DISALLOW_CONFIG_BLUETOOTH,
            UserManager.DISALLOW_CONFIG_WIFI,
            UserManager.DISALLOW_CONFIG_TETHERING,
            UserManager.DISALLOW_CONFIG_MOBILE_NETWORKS,
            UserManager.DISALLOW_CONFIG_LOCATION,
            UserManager.DISALLOW_SHARE_LOCATION,
            UserManager.DISALLOW_OUTGOING_BEAM,
            UserManager.DISALLOW_USB_FILE_TRANSFER,
            UserManager.DISALLOW_MODIFY_ACCOUNTS,
            UserManager.DISALLOW_ADD_USER,
            UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES,
            UserManager.DISALLOW_APPS_CONTROL,
            UserManager.DISALLOW_SAFE_BOOT,
            // Also stops USB debugging. To update over adb, lift the restrictions first
            UserManager.DISALLOW_DEBUGGING_FEATURES,
        )
    }
}
