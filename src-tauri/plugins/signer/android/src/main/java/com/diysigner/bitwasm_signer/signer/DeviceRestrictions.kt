package com.diysigner.bitwasm_signer.signer

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.nfc.NfcAdapter
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import androidx.core.content.ContextCompat
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import java.util.Collections

/**
 * Device features an airgapped signer would rather have off. Each is off (not checked), warn or require;
 * while one set to require is on, no seed is loaded and [onBlocked] runs when a radio comes up.
 */
internal class DeviceRestrictions(private val activity: Activity, private val onBlocked: () -> Unit) {
    private val settings = activity.getSharedPreferences("bitwasm-signer-restrictions", Context.MODE_PRIVATE)
    private val networks: MutableSet<Network> = Collections.synchronizedSet(mutableSetOf())
    private val defaults = linkedMapOf(
        "network" to "warn", "bluetooth" to "off", "keyboard" to "warn", "usb_debugging" to "warn", "accessibility" to "warn",
    )
    private val names = mapOf(
        "network" to Design.tr("ネットワーク", "A network"), "bluetooth" to Design.tr("Bluetooth・NFC", "Bluetooth or NFC"),
        "keyboard" to Design.tr("サードパーティ製キーボード", "A third-party keyboard"), "usb_debugging" to Design.tr("USBデバッグ", "USB debugging"),
        "accessibility" to Design.tr("ユーザー補助サービス", "An accessibility service"),
    )

    fun start() {
        // Networks without internet count too, so a local Wi-Fi or tethering also shows as connected
        val request = NetworkRequest.Builder().removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build()
        activity.getSystemService(ConnectivityManager::class.java).registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { networks.add(network); if (blockedBy() != null) onBlocked() }
            override fun onLost(network: Network) { networks.remove(network) }
        })
        val radios = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED).apply { addAction(NfcAdapter.ACTION_ADAPTER_STATE_CHANGED) }
        ContextCompat.registerReceiver(activity, object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) { if (blockedBy() != null) onBlocked() }
        }, radios, ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    private fun level(id: String) = settings.getString(id, null) ?: defaults.getValue(id)

    fun setLevel(id: String, level: String) {
        require(id in defaults && level in listOf("off", "warn", "require")) { "Unknown restriction" }
        settings.edit().putString(id, level).apply()
    }

    /** The name of the first restriction set to require that is on, or null. */
    fun blockedBy(): String? = defaults.keys.firstOrNull { level(it) == "require" && detected(it) != null }?.let { names[it] }

    fun json() = JSArray().apply {
        defaults.keys.forEach { id ->
            val detail = detected(id)
            put(JSObject().put("id", id).put("level", level(id)).put("active", detail != null).put("detail", detail ?: ""))
        }
    }

    // What is on, as a short detail ("" when there is nothing to name); null when off or not checked
    private fun detected(id: String): String? = if (level(id) == "off") null else when (id) {
        "network" -> "".takeIf { networks.isNotEmpty() }
        "bluetooth" -> listOfNotNull(
            "Bluetooth".takeIf { activity.getSystemService(BluetoothManager::class.java)?.adapter?.isEnabled == true },
            "NFC".takeIf { NfcAdapter.getDefaultAdapter(activity)?.isEnabled == true },
        ).joinToString(" · ").ifEmpty { null }
        "keyboard" -> thirdPartyKeyboard()
        "usb_debugging" -> "".takeIf { Settings.Global.getInt(activity.contentResolver, Settings.Global.ADB_ENABLED, 0) == 1 }
        "accessibility" -> activity.getSystemService(AccessibilityManager::class.java)
            .getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            .joinToString(", ") { runCatching { it.resolveInfo.loadLabel(activity.packageManager).toString() }.getOrDefault(it.id) }
            .ifEmpty { null }
        else -> null
    }

    // Keyboards that came with the phone are system apps, also after a Play Store update
    private fun thirdPartyKeyboard(): String? {
        val id = Settings.Secure.getString(activity.contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD) ?: return null
        val app = runCatching { activity.packageManager.getApplicationInfo(id.substringBefore('/'), 0) }.getOrNull() ?: return null
        return if (app.flags and ApplicationInfo.FLAG_SYSTEM != 0) null else app.loadLabel(activity.packageManager).toString()
    }
}
