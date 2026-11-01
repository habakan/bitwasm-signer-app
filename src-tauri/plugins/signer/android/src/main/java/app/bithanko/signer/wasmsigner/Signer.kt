package wasmsigner

import app.bithanko.signer.WasmiModule
private object L {
    const val PLAN_SIZE = 6712
    const val PLAN_N_INPUTS = 16
    const val PLAN_N_OUTPUTS = 17

    const val RV_SIZE = 64
    const val RV_TOTAL_IN = 0; const val RV_TOTAL_OUT = 8; const val RV_FEE = 16
    const val RV_OWNER = 24; const val RV_WILL_SIGN = 40; const val RV_N_SIGN = 56

    const val FACTS_SIZE = 40

    const val DP_SIZE = 2968
    const val DP_FEE = 0; const val DP_SPEND = 8; const val DP_N_OUTPUTS = 16; const val DP_OUTPUTS = 24
    const val DP_OUT_SIZE = 184
    const val DP_OUT_AMOUNT = 0; const val DP_OUT_OWNER = 8; const val DP_OUT_TEXT_KIND = 9
    const val DP_OUT_TEXT = 10; const val DP_OUT_TEXT_CAP = 167

    const val SIG_SIZE = 108
    const val SIG_INPUT = 0; const val SIG_PUBKEY = 1; const val SIG_LEN = 34; const val SIG_SIG = 35

    const val MAX_INPUTS = 16; const val MAX_OUTPUTS = 16
    const val XPUB_MAX = 120; const val DESC_MAX = 180; const val PREVTX_MAX = 32768
    const val MSG_ADDRESS = 0; const val MSG_TEXT_KIND = 75; const val MSG_TEXT = 76; const val MSG_TEXT_CAP = 1025
    const val MS_THRESHOLD = 0; const val MS_N = 1; const val MS_OURS = 2; const val MS_FINGERPRINTS = 4
    const val MS_RECEIVE = 16; const val MS_RECEIVE_CAP = 75; const val MS_DESCRIPTOR = 91; const val MS_DESCRIPTOR_CAP = 640
}

private val CORE_ERR = arrayOf(
    "OK", "FORMAT", "NO_SEED", "NOT_OURS", "NOTHING_TO_SIGN", "SIGHASH", "SCRIPT",
    "PREVTX_MISSING", "PREVTX_MISMATCH", "FEE", "NOT_REVIEWED", "CRYPTO", "NOT_FOUND", "WALLET",
)

class SignerException(val stage: String, val code: Int) : Exception(
    "$stage: ${CORE_ERR.getOrElse(code) { "unknown($code)" }}"
)

enum class Owner { EXTERNAL, CHANGE, SELF }

enum class TextKind { ADDRESS, OP_RETURN, SCRIPT }

class Review(
    val totalIn: Long,
    val totalOut: Long,
    val fee: Long,
    val nSign: Int,
    val owner: List<Owner>,
    val willSign: List<Boolean>,
)

class DisplayOutput(val amount: Long, val owner: Owner, val textKind: TextKind, val text: String)

class Display(val fee: Long, val spend: Long, val outputs: List<DisplayOutput>)

class Signature(val input: Int, val pubkey: ByteArray, val sig: ByteArray, val raw: ByteArray, val point: ByteArray? = null)

class AccountKey(val xpub: String, val descriptor: String)
class AddressPath(val chain: Int, val index: Int)
class MessageReview(val address: String, val isHex: Boolean, val text: String)
class Multisig(val threshold: Int, val ours: Int, val fingerprints: List<String>, val receive: String, val descriptor: String)

class Signer(signerWasm: ByteArray, sha256: String? = null) {
    init {
        if (sha256 != null) {
            val got = java.security.MessageDigest.getInstance("SHA-256").digest(signerWasm)
                .joinToString("") { "%02x".format(it) }
            require(got == sha256.lowercase()) {
                "signer.wasm is not the expected build: $got != ${sha256.lowercase()}"
            }
        }
    }

    private val instance = WasmiModule(signerWasm)
    private val limit = instance.memorySize
    private var reviewed = false

    init {
        for (n in listOf(
            "signer_init", "signer_input", "signer_input_cap", "signer_plan", "signer_prevtx",
            "signer_review_output", "signer_display_output", "signer_sigs", "signer_nonces", "signer_nonce_points", "signer_xpub_output",
            "signer_desc_output", "signer_mnemonic_output", "signer_seedqr_output",
            "signer_message_output", "signer_message_sig", "signer_seed_from_mnemonic",
            "signer_seed_from_seedqr", "signer_load_seed", "signer_unload", "signer_fingerprint",
            "signer_set_prevtx", "signer_review", "signer_display", "signer_sign", "signer_xpub",
            "signer_find_address", "signer_mnemonic_from_entropy", "signer_mnemonic_from_dice",
            "signer_seedqr_from_mnemonic", "signer_bip85_mnemonic", "signer_message_review",
            "signer_message_sign", "signer_multisig_load", "signer_multisig_load_cbor", "signer_multisig_unload", "signer_multisig_output",
            "signer_account_cbor", "signer_multisig_cbor", "signer_cbor_output",
            "signer_wordlist", "signer_word_letters", "signer_word_matches", "signer_final_words", "signer_words_output",
            "signer_facts", "signer_facts_output",
        ))
            require(instance.hasExport(n)) { "not a signer.wasm module: $n missing" }
    }
    private fun call(name: String, vararg a: Long): Int =
        instance.call(name, *a).toInt()

    private fun clearInput(length: Int) {
        if (length > 0) instance.write(call("signer_input"), ByteArray(length))
    }


    private fun bytes(off: Int, n: Int): ByteArray {
        if (off < 0 || n < 0 || off.toLong() + n > limit)
            throw IndexOutOfBoundsException("the module returned an offset outside its memory: $off+$n")
        return instance.readBytes(off, n)
    }
    private fun u8(off: Int): Int = bytes(off, 1)[0].toInt() and 0xff
    private fun i64(off: Int): Long = bytes(off, 8).let { b ->
        (0..7).fold(0L) { acc, i -> acc or ((b[i].toLong() and 0xffL) shl (8 * i)) }
    }
    private fun cstr(off: Int, cap: Int): String {
        val raw = bytes(off, cap)
        val n = raw.indexOf(0).let { if (it < 0) raw.size else it }
        return try { String(raw, 0, n, Charsets.UTF_8) } finally { raw.fill(0) }
    }


    val inputCapacity: Int get() = call("signer_input_cap")


    val fingerprint: String get() = "%08x".format(call("signer_fingerprint"))


    fun init(testnet: Boolean = false): Signer {
        return try {
            require(call("signer_init", if (testnet) 1L else 0L) == 1) { "init failed" }
            reviewed = false
            this
        } catch (e: Exception) {
            instance.close()
            throw e
        }
    }


    fun seedFromMnemonic(mnemonic: CharArray, passphrase: CharArray = charArrayOf()): Signer {
        var mn = ByteArray(0)
        var pass = ByteArray(0)
        var inputLength = 0
        try {
            mn = utf8(mnemonic)
            pass = utf8(passphrase)
            inputLength = mn.size + pass.size
            require(mn.size + pass.size <= inputCapacity) {
                "${mn.size + pass.size} bytes of mnemonic and passphrase does not fit in $inputCapacity"
            }
            val at = call("signer_input")
            instance.write(at, mn)
            instance.write(at + mn.size, pass)
            require(call("signer_seed_from_mnemonic", mn.size.toLong(), pass.size.toLong()) == 1) {
                "seed_from_mnemonic failed"
            }
        } finally {
            runCatching { clearInput(inputLength) }
            mn.fill(0); pass.fill(0)
            mnemonic.fill('\u0000'); passphrase.fill('\u0000')
        }
        return this
    }


    private fun utf8(chars: CharArray): ByteArray {
        val buf = java.nio.ByteBuffer.allocate(chars.size * 3) // UTF-8 needs at most 3 bytes per UTF-16 unit
        try {
            val enc = Charsets.UTF_8.newEncoder()
            enc.encode(java.nio.CharBuffer.wrap(chars), buf, true).also { if (it.isError) it.throwException() }
            enc.flush(buf)
            return buf.array().copyOf(buf.position())
        } finally {
            buf.array().fill(0)
        }
    }


    private fun chars(raw: ByteArray) = CharArray(raw.size) { raw[it].toInt().toChar() }.also { raw.fill(0) }


    private fun generate(input: ByteArray, name: String, output: String, make: () -> Int): ByteArray {
        try {
            require(input.size <= inputCapacity) { "${input.size} bytes does not fit in $inputCapacity" }
            instance.write(call("signer_input"), input)
            val length = make()
            require(length > 0) { "$name failed" }
            val at = call(output)
            return bytes(at, length).also { instance.write(at, ByteArray(length)) }
        } finally {
            input.fill(0)
        }
    }


    fun mnemonicFromEntropy(entropy: ByteArray): CharArray = chars(
        generate(entropy, "mnemonic_from_entropy", "signer_mnemonic_output") {
            call("signer_mnemonic_from_entropy", entropy.size.toLong())
        })


    fun mnemonicFromDice(rolls: ByteArray, words: Int = 24): CharArray {
        require(words == 12 || words == 24) { "dice make 12 or 24 words, not $words" }
        return chars(generate(rolls, "mnemonic_from_dice", "signer_mnemonic_output") {
            call("signer_mnemonic_from_dice", rolls.size.toLong(), words.toLong())
        })
    }


    fun diceCheck(rolls: ByteArray, words: Int): Int {
        require(rolls.size <= inputCapacity) { "${rolls.size} bytes of rolls does not fit in $inputCapacity" }
        instance.write(call("signer_input"), rolls)
        return call("signer_dice_check", rolls.size.toLong(), words.toLong())
    }

    fun seedQrFromMnemonic(mnemonic: CharArray, compact: Boolean = false): ByteArray {
        try {
            val encoded = utf8(mnemonic)
            return generate(encoded, "seedqr_from_mnemonic", "signer_seedqr_output") {
                call("signer_seedqr_from_mnemonic", encoded.size.toLong(), if (compact) 1L else 0L)
            }
        } finally {
            mnemonic.fill('\u0000')
        }
    }


    fun bip85Mnemonic(words: Int = 24, index: Int = 0): CharArray {
        require(words == 12 || words == 18 || words == 24) { "BIP85 supports 12, 18, or 24 words" }
        require(index >= 0) { "BIP85 index must be below 2^31" }
        require(fingerprint != "00000000") { "no seed is loaded" }
        return chars(generate(ByteArray(0), "bip85_mnemonic", "signer_mnemonic_output") {
            call("signer_bip85_mnemonic", words.toLong(), index.toLong())
        })
    }


    fun findAddress(address: String, account: Int = 0, count: Int = 1000): AddressPath? {
        require(account >= 0 && count in 1..100_000) { "account or address search count is out of range" }
        val payload = address.trim().replace(Regex("^bitcoin:", RegexOption.IGNORE_CASE), "")
            .substringBefore('?').toByteArray()
        try {
            require(payload.size <= inputCapacity) { "${payload.size} bytes of address does not fit in $inputCapacity" }
            instance.write(call("signer_input"), payload)
            val result = call("signer_find_address", payload.size.toLong(), account.toLong(), count.toLong())
            if (result >= 0) return AddressPath(result shr 20, result and 0xfffff)
            if (result != -CORE_ERR.indexOf("NOT_FOUND")) throw SignerException("findAddress", -result)
            return null
        } finally {
            runCatching { clearInput(payload.size) }
            payload.fill(0)
        }
    }


    fun messageReview(message: ByteArray, purpose: Int = 84, account: Int = 0, chain: Int = 0, index: Int = 0): MessageReview {
        var output = -1
        try {
            require(purpose == 49 || purpose == 84) { "message signing supports BIP49 or BIP84" }
            require(account >= 0 && chain in 0..1 && index >= 0) { "message path is out of range" }
            require(message.size <= inputCapacity) { "${message.size} bytes of message does not fit in $inputCapacity" }
            instance.write(call("signer_input"), message)
            val result = call("signer_message_review", message.size.toLong(), purpose.toLong(), account.toLong(), chain.toLong(), index.toLong())
            if (result != 0) throw SignerException("messageReview", result)
            output = call("signer_message_output")
            val at = output
            return MessageReview(cstr(at + L.MSG_ADDRESS, L.MSG_TEXT_KIND), u8(at + L.MSG_TEXT_KIND) != 0,
                cstr(at + L.MSG_TEXT, L.MSG_TEXT_CAP))
        } finally {
            runCatching { clearInput(message.size) }
            if (output >= 0) runCatching { instance.write(output, ByteArray(1101)) }
            message.fill(0)
        }
    }


    fun messageSign(): ByteArray {
        val result = call("signer_message_sign")
        if (result != 0) throw SignerException("messageSign", result)
        val at = call("signer_message_sig")
        return bytes(at, 65).also { instance.write(at, ByteArray(65)) }
    }


    fun loadSeed(seed: ByteArray): Signer {
        try {
            require(seed.size == 64) { "a seed is 64 bytes, got ${seed.size}" }
            instance.write(call("signer_input"), seed)
            require(call("signer_load_seed") == 1) { "load_seed failed" }
        } finally {
            runCatching { clearInput(seed.size) }
            seed.fill(0)
        }
        return this
    }


    fun seedFromSeedQr(qr: ByteArray, passphrase: CharArray = charArrayOf()): Signer {
        var pass = ByteArray(0)
        var inputLength = 0
        try {
            pass = utf8(passphrase)
            inputLength = qr.size + pass.size
            require(qr.size + pass.size <= inputCapacity) {
                "${qr.size + pass.size} bytes of SeedQR and passphrase does not fit in $inputCapacity"
            }
            val at = call("signer_input")
            instance.write(at, qr)
            instance.write(at + qr.size, pass)
            require(call("signer_seed_from_seedqr", qr.size.toLong(), pass.size.toLong()) == 1) {
                "seed_from_seedqr failed"
            }
        } finally {
            runCatching { clearInput(inputLength) }
            qr.fill(0)
            pass.fill(0)
            passphrase.fill('\u0000')
        }
        return this
    }


    fun unload() {
        try {
            call("signer_unload")
        } finally {
            reviewed = false
            instance.close()
        }
    }

    fun close() = instance.close()


    fun setPlan(plan: ByteArray): Signer {
        require(plan.size == L.PLAN_SIZE) { "a plan is ${L.PLAN_SIZE} bytes, got ${plan.size}" }
        instance.write(call("signer_plan"), plan)
        reviewed = false
        return this
    }


    fun setPrevTxs(prevTxs: List<ByteArray?>): Signer {
        val base = call("signer_prevtx")
        var used = 0
        for (i in 0 until L.MAX_INPUTS) {
            val raw = prevTxs.getOrNull(i)
            if (raw == null || raw.isEmpty()) {
                call("signer_set_prevtx", i.toLong(), 0L, 0L)
                continue
            }
            require(used + raw.size <= L.PREVTX_MAX) { "prevtx $i does not fit" }
            instance.write(base + used, raw)
            require(call("signer_set_prevtx", i.toLong(), used.toLong(), raw.size.toLong()) == 1) {
                "prevtx $i does not fit"
            }
            used += raw.size
        }
        return this
    }


    fun review(): Review {
        val rc = call("signer_review")
        if (rc != 0) throw SignerException("review", rc)
        reviewed = true
        val at = call("signer_review_output")
        return Review(
            totalIn = i64(at + L.RV_TOTAL_IN),
            totalOut = i64(at + L.RV_TOTAL_OUT),
            fee = i64(at + L.RV_FEE),
            nSign = u8(at + L.RV_N_SIGN),
            owner = (0 until L.MAX_OUTPUTS).map { Owner.entries[u8(at + L.RV_OWNER + it)] },
            willSign = (0 until L.MAX_INPUTS).map { u8(at + L.RV_WILL_SIGN + it) != 0 },
        )
    }


    /** What only the seed and the registered wallet know about the plan set last: core_facts_t, as laid out */
    fun facts(): ByteArray {
        val rc = call("signer_facts")
        if (rc != 0) throw SignerException("facts", rc)
        return instance.readBytes(call("signer_facts_output"), L.FACTS_SIZE)
    }


    fun display(): Display {
        val rc = call("signer_display")
        if (rc != 0) throw SignerException("display", rc)
        val at = call("signer_display_output")
        val n = u8(at + L.DP_N_OUTPUTS)
        return Display(
            fee = i64(at + L.DP_FEE),
            spend = i64(at + L.DP_SPEND),
            outputs = (0 until n).map { i ->
                val o = at + L.DP_OUTPUTS + i * L.DP_OUT_SIZE
                DisplayOutput(
                    amount = i64(o + L.DP_OUT_AMOUNT),
                    owner = Owner.entries[u8(o + L.DP_OUT_OWNER)],
                    textKind = TextKind.entries[u8(o + L.DP_OUT_TEXT_KIND)],
                    text = cstr(o + L.DP_OUT_TEXT, L.DP_OUT_TEXT_CAP),
                )
            },
        )
    }


    /** nonces is Parser.nonces(): an input with the coordinator's n is signed with an anti-exfil nonce, and its Q comes back as point */
    fun sign(nonces: ByteArray? = null): List<Signature> {
        check(reviewed) { "review() has to pass first; one approval permits one signing" }
        nonces?.let { require(it.size == 33 * 16) { "nonces are 16 x 33 bytes" }; instance.write(call("signer_nonces"), it) }
        val rc = call("signer_sign")
        reviewed = false
        if (rc < 0) throw SignerException("sign", -rc)
        val base = call("signer_sigs")
        return (0 until rc).map { i ->
            val at = base + i * L.SIG_SIZE
            Signature(
                input = u8(at + L.SIG_INPUT),
                pubkey = bytes(at + L.SIG_PUBKEY, 33),
                sig = bytes(at + L.SIG_SIG, u8(at + L.SIG_LEN)),
                raw = bytes(at, L.SIG_SIZE),
                point = bytes(call("signer_nonce_points") + i * 33, 33).takeIf { q -> q.any { it != 0.toByte() } },
            )
        }
    }


    fun xpub(purpose: Int = 84, account: Int = 0): AccountKey {
        require(purpose == 48 || purpose == 49 || purpose == 84 || purpose == 86) { "xpub supports BIP48, BIP49, BIP84, or BIP86" }
        require(account >= 0) { "account must be below 2^31" }
        val rc = call("signer_xpub", purpose.toLong(), account.toLong())
        if (rc != 0) throw SignerException("xpub", rc)
        return AccountKey(
            xpub = cstr(call("signer_xpub_output"), L.XPUB_MAX),
            descriptor = cstr(call("signer_desc_output"), L.DESC_MAX),
        )
    }

    fun multisigLoad(text: ByteArray): Multisig {
        return loadMultisig(text, false)
    }

    fun multisigLoadCbor(cbor: ByteArray): Multisig = loadMultisig(cbor, true)

    private fun loadMultisig(raw: ByteArray, cbor: Boolean): Multisig {
        require(raw.size <= call("signer_input_cap")) { "${raw.size} bytes of multisig setup does not fit" }
        instance.write(call("signer_input"), raw)
        val stage = if (cbor) "multisigLoadCbor" else "multisigLoad"
        val export = if (cbor) "signer_multisig_load_cbor" else "signer_multisig_load"
        val rc = call(export, raw.size.toLong())
        if (rc != 0) throw SignerException(stage, rc)
        val at = call("signer_multisig_output")
        val fps = bytes(at + L.MS_FINGERPRINTS, 4 * u8(at + L.MS_N))
        return Multisig(
            threshold = u8(at + L.MS_THRESHOLD),
            ours = u8(at + L.MS_OURS),
            fingerprints = fps.toList().chunked(4).map { b -> "%08x".format((0..3).fold(0) { acc, i -> acc or ((b[i].toInt() and 0xff) shl (8 * i)) }) },
            receive = cstr(at + L.MS_RECEIVE, L.MS_RECEIVE_CAP),
            descriptor = cstr(at + L.MS_DESCRIPTOR, L.MS_DESCRIPTOR_CAP),
        )
    }

    fun multisigUnload() { call("signer_multisig_unload") }

    fun accountCbor(account: Int = 0): ByteArray = cbor("accountCbor", call("signer_account_cbor", account.toLong()))

    fun multisigCbor(): ByteArray = cbor("multisigCbor", call("signer_multisig_cbor"))

    private fun cbor(name: String, rc: Int): ByteArray {
        if (rc < 0) throw SignerException(name, -rc)
        return bytes(call("signer_cbor_output"), rc)
    }

    /** The wordlist the module checks against, in index order. */
    fun wordlist(): List<String> {
        val raw = bytes(call("signer_wordlist"), 2048 * 8)
        return List(2048) { String(raw, it * 8, 8, Charsets.US_ASCII).trimEnd('\u0000') }
    }

    /** Bit i is set when 'a' + i follows [prefix] in some word, among [filter] when it is given. */
    fun wordLetters(prefix: CharSequence, filter: IntArray? = null): Int =
        withWords(prefix, filter) { call("signer_word_letters", prefix.length.toLong(), it.toLong()) }

    /** Indices of the words starting with [prefix], among [filter] when it is given. */
    fun wordMatches(prefix: CharSequence, filter: IntArray? = null): IntArray =
        wordsOutput(withWords(prefix, filter) { call("signer_word_matches", prefix.length.toLong(), it.toLong()) } and 0xfff)

    /** Last words that give [first] plus one word a valid checksum. A secret: it follows from [first]. */
    fun finalWords(first: IntArray): IntArray =
        wordsOutput(withWords("", first) { call("signer_final_words", first.size + 1L) })

    // Letters, then little-endian uint16 indices; the module wipes its input after each call
    private fun withWords(prefix: CharSequence, indices: IntArray?, run: (Int) -> Int): Int {
        val list = indices ?: IntArray(0)
        val input = ByteArray(prefix.length + 2 * list.size)
        prefix.forEachIndexed { i, c -> input[i] = c.code.toByte() }
        list.forEachIndexed { i, v ->
            input[prefix.length + 2 * i] = v.toByte()
            input[prefix.length + 2 * i + 1] = (v shr 8).toByte()
        }
        try {
            instance.write(call("signer_input"), input)
            return run(list.size)
        } finally {
            input.fill(0)
        }
    }

    private fun wordsOutput(n: Int): IntArray {
        val raw = bytes(call("signer_words_output"), 2 * n)
        return try {
            IntArray(n) { (raw[2 * it].toInt() and 0xff) or ((raw[2 * it + 1].toInt() and 0xff) shl 8) }
        } finally {
            raw.fill(0)
        }
    }
}
