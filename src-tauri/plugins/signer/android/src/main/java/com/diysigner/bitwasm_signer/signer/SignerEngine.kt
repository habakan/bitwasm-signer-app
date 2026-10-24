package com.diysigner.bitwasm_signer.signer

import android.content.Context
import wasmsigner.Multisig
import wasmsigner.Signer
import wasmsigner.Owner
import wasmpsbt.Parser
import wasmpsbt.Signature

internal fun restrictedMessage(name: String) =
    Design.tr("${name}がオンです。設定の「端末の機能制限」で、オフにすることを必須にしています。", "$name is on, and Device restrictions in Settings require it to be off.")

internal class SignerEngine(private val context: Context) {
    private var signer: Signer? = null
    private var selectedTestnet = false
    private val parserDelegate = lazy {
        val wasm = context.assets.open("parser.wasm").use { it.readBytes() }
        try { Parser(wasm, PARSER_SHA256) } finally { wasm.fill(0) }
    }
    private val parser by parserDelegate
    private val checkerDelegate = lazy { CheckerReview(context.assets.open("checker.wasm").use { it.readBytes() }) }
    private val checker by checkerDelegate
    private val wallets = context.getSharedPreferences("bitwasm-signer-multisig", Context.MODE_PRIVATE)
    var multisig: Multisig? = null
        private set
    val isLoaded: Boolean get() = signer != null
    val fingerprint: String? get() = signer?.fingerprint
    val testnet: Boolean get() = selectedTestnet
    /** Names a device feature that is on while Device restrictions require it off; no seed is loaded then. */
    var blockedBy: () -> String? = { null }
    val words: List<String> by lazy { wordEntry().let { try { it.wordlist() } finally { it.unload() } } }

    /** A module of its own for typing a mnemonic, never holding a key; unload it when the entry closes. */
    fun wordEntry(): Signer {
        val wasm = context.assets.open("signer.wasm").use { it.readBytes() }
        try { return Signer(wasm, SIGNER_SHA256) } finally { wasm.fill(0) }
    }

    @Synchronized
    fun setNetwork(testnet: Boolean) {
        require(!isLoaded) { "Lock the signing key before changing networks" }
        selectedTestnet = testnet
    }

    fun parserInfo(): String {
        parser
        val wasm = context.assets.open("signer.wasm").use { it.readBytes() }
        try { Signer(wasm, SIGNER_SHA256).close() } finally { wasm.fill(0) }
        return PARSER_SHA256
    }

    fun close() {
        try { lock() } finally {
            if (parserDelegate.isInitialized()) parser.close()
            if (checkerDelegate.isInitialized()) checker.close()
        }
    }

    @Synchronized
    fun loadSeedQr(candidates: List<Pair<String, ByteArray>>, scanInfo: String, passphrase: CharArray = charArrayOf()): ByteArray {
        val failures = mutableListOf<String>()
        try {
            blockedBy()?.let { error(restrictedMessage(it)) }
            val module = context.assets.open("signer.wasm").use { it.readBytes() }
            try {
                for ((source, payload) in candidates) {
                    val next = try {
                        Signer(module, SIGNER_SHA256).init(selectedTestnet)
                    } catch (e: Exception) {
                        failures += "$source:${e.message}"
                        continue
                    }
                    val loaded = payload.copyOf()
                    try {
                        when (payload.size) {
                            64 -> {
                                require(passphrase.isEmpty()) { "A passphrase can only be used with a SeedQR" }
                                next.loadSeed(payload)
                            }
                            16, 32, 48, 96 -> next.seedFromSeedQr(payload, passphrase.copyOf())
                            else -> error("unsupported payload length ${payload.size}")
                        }
                        adopt(next)
                        return loaded
                    } catch (e: Exception) {
                        failures += "$source:${e.message}"
                        loaded.fill(0)
                        next.unload()
                    }
                }
                val diagnostic = "SeedQR diagnostic: $scanInfo; ${failures.joinToString("; ")}"
                android.util.Log.w("SignerSeedQR", diagnostic)
                error(diagnostic)
            } finally {
                module.fill(0)
            }
        } finally {
            candidates.forEach { it.second.fill(0) }
            passphrase.fill('\u0000')
        }
    }

    @Synchronized
    fun loadMnemonic(mnemonic: CharArray, passphrase: CharArray = charArrayOf()) {
        try {
            blockedBy()?.let { error(restrictedMessage(it)) }
            val module = context.assets.open("signer.wasm").use { it.readBytes() }
            try {
                val next = Signer(module, SIGNER_SHA256).init(selectedTestnet)
                try {
                    next.seedFromMnemonic(mnemonic, passphrase)
                } catch (e: Exception) {
                    next.unload()
                    error("The mnemonic is invalid or its checksum does not match")
                }
                adopt(next)
            } finally {
                module.fill(0)
            }
        } finally {
            mnemonic.fill('\u0000')
            passphrase.fill('\u0000')
        }
    }

    // The 16 or 32 bytes of a 12 or 24 word seed, which is what the vault keeps; null for anything else
    @Synchronized
    fun compactEntropy(payload: ByteArray): ByteArray? = when {
        payload.size == 16 || payload.size == 32 -> payload.copyOf()
        (payload.size == 48 || payload.size == 96) && payload.all { it in '0'.code.toByte()..'9'.code.toByte() } -> {
            val mnemonic = (payload.indices step 4).joinToString(" ") { words[String(payload, it, 4, Charsets.US_ASCII).toInt()] }
            withTemporarySigner { it.seedQrFromMnemonic(mnemonic.toCharArray(), compact = true) }
        }
        else -> null
    }

    @Synchronized
    fun mnemonicEntropy(mnemonic: CharArray): ByteArray? =
        runCatching { withTemporarySigner { it.seedQrFromMnemonic(mnemonic.copyOf(), compact = true) } }.getOrNull()

    @Synchronized
    fun lock() {
        signer?.unload()
        signer = null
        multisig = null
    }

    // A wallet registered while storage was on comes back with its seed; it is public, so it is kept in the clear
    private fun adopt(next: Signer) {
        signer?.unload()
        signer = next
        multisig = wallets.getString(walletKey(next), null)?.let { runCatching { next.multisigLoad(it.toByteArray()) }.getOrNull() }
    }

    private fun walletKey(key: Signer) = "${key.fingerprint}-${if (selectedTestnet) "test" else "main"}"

    @Synchronized
    fun registerMultisig(payload: ByteArray, typedCbor: Boolean = false): Multisig {
        val key = requireNotNull(signer) { "Load a seed first" }
        multisig = null
        val wallet = if (typedCbor) key.multisigLoadCbor(payload) else key.multisigLoad(payload)
        return wallet.also { multisig = it }
    }

    @Synchronized
    fun keepMultisig(persist: Boolean) {
        val key = requireNotNull(signer) { "Load a seed first" }
        val wallet = requireNotNull(multisig) { "Register a multisig first" }
        if (persist) wallets.edit().putString(walletKey(key), wallet.descriptor).apply()
    }

    @Synchronized
    fun forgetMultisig() {
        signer?.let { it.multisigUnload(); wallets.edit().remove(walletKey(it)).apply() }
        multisig = null
    }

    fun forgetSavedMultisigs() = wallets.edit().clear().apply()

    @Synchronized
    fun accountUr(account: Int = 0): List<String> {
        val cbor = requireNotNull(signer) { "Load a seed first" }.accountCbor(account)
        val encoder = parser.urEncodeCbor(true, cbor)
        return (0 until encoder.seqLen).map { encoder.next() }
    }

    @Synchronized
    fun multisigUr(): List<String> {
        val cbor = requireNotNull(signer) { "Load a seed first" }.multisigCbor()
        val encoder = parser.urEncodeCbor(false, cbor)
        return (0 until encoder.seqLen).map { encoder.next() }
    }

    @Synchronized
    fun mnemonicFromEntropy(entropy: ByteArray): CharArray = withTemporarySigner { it.mnemonicFromEntropy(entropy) }

    @Synchronized
    fun mnemonicFromDice(rolls: ByteArray, words: Int = 24): CharArray = withTemporarySigner {
        it.mnemonicFromDice(rolls, words)
    }

    @Synchronized
    fun seedQrFromMnemonic(mnemonic: CharArray, compact: Boolean = false): ByteArray = withTemporarySigner {
        it.seedQrFromMnemonic(mnemonic, compact)
    }

    @Synchronized
    fun bip85Mnemonic(words: Int = 24, index: Int = 0): CharArray =
        requireNotNull(signer) { "Load a seed first" }.bip85Mnemonic(words, index)

    @Synchronized
    fun findAddress(address: String, account: Int = 0, count: Int = 1000): wasmsigner.AddressPath? =
        requireNotNull(signer) { "Load a seed first" }.findAddress(address, account, count)

    @Synchronized
    fun reviewMessage(message: ByteArray, purpose: Int = 84, account: Int = 0, chain: Int = 0, index: Int = 0): wasmsigner.MessageReview =
        requireNotNull(signer) { "Load a seed first" }.messageReview(message, purpose, account, chain, index)

    @Synchronized
    fun signMessage(): ByteArray = requireNotNull(signer) { "Load a seed first" }.messageSign()

    private fun <T> withTemporarySigner(operation: (Signer) -> T): T {
        val module = context.assets.open("signer.wasm").use { it.readBytes() }
        try {
            val temporary = Signer(module, SIGNER_SHA256).init(selectedTestnet)
            try {
                return operation(temporary)
            } finally {
                temporary.unload()
            }
        } finally {
            module.fill(0)
        }
    }

    @Synchronized
    fun prepare(psbt: ByteArray): TransactionReview {
        val key = requireNotNull(signer) { "Load a SeedQR first" }
        val plan = parser.parse(psbt, key.fingerprint.toLong(16).toInt())
        val rawPlan = parser.rawPlan()
        val prevTxs = plan.inputs.map { it.prevtx }
        key.setPlan(rawPlan).setPrevTxs(prevTxs)
        val review = key.review()
        val display = key.display()
        if (!checker.agrees(rawPlan, key.facts(), prevTxs, review, display)) {
            key.setPlan(ByteArray(6712))
            throw IllegalStateException("checker.wasm's review disagrees with signer.wasm, so this transaction is refused")
        }
        val rows = display.outputs.mapIndexed { index, output ->
            val owner = when (output.owner) {
                Owner.CHANGE -> "Change"
                Owner.SELF -> "Self"
                Owner.EXTERNAL -> "Send to"
            }
            TransactionOutput(index + 1, output.amount, owner, output.textKind.name, output.text)
        }
        return TransactionReview(review.totalIn, review.totalOut, review.fee, display.spend, review.nSign, rows)
    }

    @Synchronized
    fun sign(): List<String> {
        val key = requireNotNull(signer) { "The signing key is locked" }
        val signatures = key.sign(parser.nonces())
        val signed = parser.finalize(signatures.map { Signature(it.input, it.pubkey, it.sig, it.point) })
        val encoder = parser.urEncode(signed.size)
        return (0 until encoder.seqLen).map { encoder.next() }
    }

    @Synchronized
    fun cancelReview() {
        signer?.setPlan(ByteArray(6712))
    }

    @Synchronized
    fun accountQrContents(purpose: Int = 84, account: Int = 0): List<String> {
        val key = requireNotNull(signer) { "Load a SeedQR first" }.xpub(purpose, account)
        return listOf(key.xpub, key.descriptor)
    }

    companion object {
        const val PARSER_SHA256 = "9407abe3a65a56ebcfcab6da3b685f4e21ce9f6a60b3feddd299ddc0def89bab"
        private const val SIGNER_SHA256 = "f1ec4d091292d83f44cd479219914e1b2f080c930867e8086d731bf76deb979c"
    }
}

internal data class TransactionReview(
    val totalIn: Long,
    val totalOut: Long,
    val fee: Long,
    val spend: Long,
    val signatures: Int,
    val outputs: List<TransactionOutput>,
)

internal data class TransactionOutput(val index: Int, val amount: Long, val owner: String, val kind: String, val text: String)
