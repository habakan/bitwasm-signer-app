package com.diysigner.bitwasm_signer.signer

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.security.keystore.StrongBoxUnavailableException
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec

// Saved seeds: BIP39 entropy under a Keystore AES key per seed that needs the device owner for every use.
// The passphrase is never stored; the fingerprint it produced is, so a wrong one is caught on unlock
internal class KeyVault(private val context: Context) {
    class Entry(val id: String, val name: String, val fingerprint: String, val iv: ByteArray, val data: ByteArray)

    private val prefs = context.getSharedPreferences("bitwasm-signer-vault", Context.MODE_PRIVATE)
    private val file = File(context.noBackupFilesDir, "vault.json")
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    private var cache: MutableList<Entry>? = null

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) { prefs.edit().putBoolean("enabled", value).apply() }

    val deviceSecure: Boolean get() = context.getSystemService(KeyguardManager::class.java).isDeviceSecure

    @Synchronized
    fun entries(): List<Entry> = cache ?: read().also { cache = it }

    private fun read(): MutableList<Entry> {
        if (!file.exists()) return mutableListOf()
        val items = JSONArray(file.readText())
        return (0 until items.length()).map { i ->
            val item = items.getJSONObject(i)
            Entry(
                item.getString("id"), item.getString("name"), item.getString("fingerprint"),
                Base64.decode(item.getString("iv"), Base64.NO_WRAP), Base64.decode(item.getString("data"), Base64.NO_WRAP),
            )
        }.toMutableList()
    }

    private fun write(entries: MutableList<Entry>) {
        val items = JSONArray(entries.map {
            JSONObject().put("id", it.id).put("name", it.name).put("fingerprint", it.fingerprint)
                .put("iv", Base64.encodeToString(it.iv, Base64.NO_WRAP))
                .put("data", Base64.encodeToString(it.data, Base64.NO_WRAP))
        })
        val next = File(file.parentFile, "vault.json.tmp")
        next.writeText(items.toString())
        check(next.renameTo(file)) { "Could not write the saved seeds" }
        cache = entries
    }

    fun newId(): String = UUID.randomUUID().toString()

    // Before Android 11 a key cannot ask for biometrics or the screen lock on each use, so it allows a short window
    fun encryptCipher(id: String): Cipher {
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        fun spec(strongBox: Boolean) = KeyGenParameterSpec.Builder(alias(id), KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL)
                } else {
                    @Suppress("DEPRECATION")
                    setUserAuthenticationValidityDurationSeconds(AUTH_WINDOW_SECONDS)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    setIsStrongBoxBacked(strongBox)
                    setUnlockedDeviceRequired(true)
                }
            }
            .build()
        try {
            generator.init(spec(Build.VERSION.SDK_INT >= Build.VERSION_CODES.P))
            generator.generateKey()
        } catch (e: Exception) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P || e !is StrongBoxUnavailableException) throw e
            generator.init(spec(false))
            generator.generateKey()
        }
        if (!inSecureHardware(key(id))) {
            discardKey(id)
            error("This device cannot keep the key in secure hardware, so seeds cannot be saved on it")
        }
        return Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key(id)) }
    }

    // A device without a TEE falls back to a software key store, where the key is only as safe as the app's files
    private fun inSecureHardware(key: SecretKey): Boolean {
        val info = SecretKeyFactory.getInstance(key.algorithm, "AndroidKeyStore").getKeySpec(key, KeyInfo::class.java) as KeyInfo
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            info.securityLevel == KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT ||
                info.securityLevel == KeyProperties.SECURITY_LEVEL_STRONGBOX ||
                info.securityLevel == KeyProperties.SECURITY_LEVEL_UNKNOWN_SECURE
        } else {
            @Suppress("DEPRECATION")
            info.isInsideSecureHardware
        }
    }

    fun decryptCipher(entry: Entry): Cipher =
        Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.DECRYPT_MODE, key(entry.id), GCMParameterSpec(128, entry.iv)) }

    @Synchronized
    fun save(id: String, name: String, fingerprint: String, cipher: Cipher, entropy: ByteArray) {
        val data = cipher.doFinal(entropy)
        write((entries() + Entry(id, name, fingerprint, cipher.iv, data)).toMutableList())
    }

    fun discardKey(id: String) {
        if (keyStore.containsAlias(alias(id))) keyStore.deleteEntry(alias(id))
    }

    @Synchronized
    fun delete(entry: Entry) {
        discardKey(entry.id)
        write(entries().filter { it.id != entry.id }.toMutableList())
    }

    @Synchronized
    fun eraseAll() {
        entries().forEach { discardKey(it.id) }
        write(mutableListOf())
    }

    private fun key(id: String) = keyStore.getKey(alias(id), null) as SecretKey

    private fun alias(id: String) = "bitwasm-signer-seed-$id"

    companion object {
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val AUTH_WINDOW_SECONDS = 15
    }
}
