package wasmpsbt

import app.bithanko.signer.WasmiModule

private const val MAGIC = 0x4e4c5042           // "BPLN"
private const val ABI_VERSION = 2
private object L {
    const val MAGIC_OFF = 0; const val VERSION = 4; const val TX_VERSION = 8; const val LOCKTIME = 12
    const val N_INPUTS = 16; const val N_OUTPUTS = 17
    const val INPUTS = 24; const val INPUT_SIZE = 176
    const val OUTPUTS = 2840; const val OUTPUT_SIZE = 136
    const val IN_PREV_TXID = 0; const val IN_PREV_VOUT = 32; const val IN_SEQUENCE = 36
    const val IN_AMOUNT = 40; const val IN_SPK = 48; const val IN_KEY = 132; const val IN_SIGHASH = 172
    const val OUT_AMOUNT = 0; const val OUT_SPK = 8; const val OUT_KEY = 92
    const val KEY_DEPTH = 0; const val KEY_FINGERPRINT = 4; const val KEY_PATH = 8
    const val SIG_SIZE = 108; const val MAX_INPUTS = 16
}

private val P_ERR = arrayOf("OK", "MAGIC", "FORMAT", "DUPLICATE", "TX", "UNSUPPORTED", "LIMIT", "UTXO", "SIG")
private val UR_ERR = arrayOf("", "SCHEME", "BYTEWORDS", "PART", "MISMATCH", "LIMIT", "MESSAGE", "TYPE")

class ParserException(val code: Int, kind: String = "P_ERR") : Exception(
    if (kind == "P_ERR") "P_ERR_" + (P_ERR.getOrNull(code) ?: code)
    else "UR_ERR_" + (UR_ERR.getOrNull(-code) ?: code)
)

class KeyOrigin(val fingerprint: Int, val path: IntArray) {
    override fun toString(): String {
        val fp = "%08x".format(fingerprint)
        return (listOf(fp) + path.map { if (it < 0) "${it and 0x7fffffff}h" else "$it" }).joinToString("/")
    }
}

class PlanInput(
    val prevTxid: ByteArray, val prevVout: Int, val sequence: Int,
    val amount: Long, val spk: ByteArray, val key: KeyOrigin?, val sighashType: Int,

    val prevtx: ByteArray?,
)

class PlanOutput(val amount: Long, val spk: ByteArray, val key: KeyOrigin?)

class Plan(val txVersion: Int, val locktime: Int, val inputs: List<PlanInput>, val outputs: List<PlanOutput>) {
    val totalIn: Long get() = inputs.sumOf { it.amount }
    val totalOut: Long get() = outputs.sumOf { it.amount }

    val fee: Long get() = totalIn - totalOut
}

/** point: the anti-exfil Q that goes in as a proprietary field, when the signer had the coordinator's n */
class Signature(val input: Int, val pubkey: ByteArray, val sig: ByteArray, val point: ByteArray? = null)

class UrEncoder internal constructor(val seqLen: Int, private val next: () -> String) {

    fun next(): String = next.invoke()
}

class Parser(parserWasm: ByteArray, sha256: String? = null) : AutoCloseable {
    init {
        if (sha256 != null) {
            val got = java.security.MessageDigest.getInstance("SHA-256").digest(parserWasm)
                .joinToString("") { "%02x".format(it) }
            require(got == sha256.lowercase()) {
                "parser.wasm is not the expected build: $got != ${sha256.lowercase()}"
            }
        }
    }

    private val instance = WasmiModule(parserWasm)
    private val limit = instance.memorySize

    init {
        for (n in listOf("parser_input", "parser_input_cap", "parser_parse", "parser_plan"))
            require(instance.hasExport(n)) { "not a parser.wasm module: $n missing" }
    }
    private fun call(name: String, vararg a: Long): Int =
        instance.call(name, *a).toInt()


    private fun bytes(off: Int, n: Int): ByteArray {
        if (off < 0 || n < 0 || off.toLong() + n > limit)
            throw IndexOutOfBoundsException("the module returned an offset outside its memory: $off+$n")
        return instance.readBytes(off, n)
    }
    private fun u8(off: Int): Int = bytes(off, 1)[0].toInt() and 0xff
    private fun i32(off: Int): Int = bytes(off, 4).let { b ->
        (0..3).fold(0) { acc, i -> acc or ((b[i].toInt() and 0xff) shl (8 * i)) }
    }
    private fun i64(off: Int): Long = bytes(off, 8).let { b ->
        (0..7).fold(0L) { acc, i -> acc or ((b[i].toLong() and 0xffL) shl (8 * i)) }
    }
    private fun script(off: Int): ByteArray = bytes(off + 1, u8(off))
    private fun key(off: Int): KeyOrigin? {
        val depth = u8(off + L.KEY_DEPTH)
        if (depth == 0) return null                 // depth 0: the module found no derivation
        return KeyOrigin(i32(off + L.KEY_FINGERPRINT), IntArray(depth) { i32(off + L.KEY_PATH + it * 4) })
    }


    val inputCapacity: Int get() = call("parser_input_cap")

    private fun writeInput(data: ByteArray) {
        require(data.size <= inputCapacity) { "${data.size} bytes does not fit in $inputCapacity" }
        instance.write(call("parser_input"), data)
    }


    fun parse(psbt: ByteArray, fingerprint: Int): Plan {
        writeInput(psbt)
        val rc = call("parser_parse", psbt.size.toLong(), fingerprint.toLong() and 0xffffffffL)
        if (rc != 0) throw ParserException(rc)
        return readPlan()
    }

    fun rawPlan(): ByteArray = bytes(call("parser_plan"), 6712)

    private fun readPlan(): Plan {
        val p = call("parser_plan")
        if (i32(p + L.MAGIC_OFF) != MAGIC) throw IllegalStateException("plan_t magic mismatch")
        val version = i32(p + L.VERSION)
        if (version != ABI_VERSION) throw IllegalStateException("plan_t version $version, this host speaks $ABI_VERSION")

        val inputs = (0 until u8(p + L.N_INPUTS)).map { i ->
            val o = p + L.INPUTS + i * L.INPUT_SIZE
            val len = call("parser_prevtx_len", i.toLong())
            PlanInput(
                prevTxid = bytes(o + L.IN_PREV_TXID, 32),
                prevVout = i32(o + L.IN_PREV_VOUT),
                sequence = i32(o + L.IN_SEQUENCE),
                amount = i64(o + L.IN_AMOUNT),
                spk = script(o + L.IN_SPK),
                key = key(o + L.IN_KEY),
                sighashType = u8(o + L.IN_SIGHASH),
                prevtx = if (len > 0) bytes(call("parser_input") + call("parser_prevtx_off", i.toLong()), len) else null,
            )
        }
        val outputs = (0 until u8(p + L.N_OUTPUTS)).map { i ->
            val o = p + L.OUTPUTS + i * L.OUTPUT_SIZE
            PlanOutput(i64(o + L.OUT_AMOUNT), script(o + L.OUT_SPK), key(o + L.OUT_KEY))
        }
        return Plan(i32(p + L.TX_VERSION), i32(p + L.LOCKTIME), inputs, outputs)
    }


    fun urReset() { call("parser_ur_reset") }


    fun urReceive(part: String): ByteArray? {
        val raw = part.toByteArray()
        writeInput(raw)
        val rc = call("parser_ur_receive", raw.size.toLong())
        if (rc < 0) throw ParserException(rc, "UR_ERR")
        return if (rc == 0) null else bytes(call("parser_input"), rc)
    }


    val urProgress: Int get() = call("parser_ur_progress")

    val urKind: String get() = when (call("parser_ur_kind")) {
        1 -> "bytes"
        2 -> "crypto-output"
        else -> "psbt"
    }

    val urIsBytes: Boolean get() = urKind == "bytes"

    fun urEncodeCbor(account: Boolean, cbor: ByteArray, fragmentLen: Int = 100): UrEncoder {
        instance.write(call("parser_output"), cbor)
        val seqLen = call("parser_ur_encode_cbor", if (account) 1L else 2L, cbor.size.toLong(), fragmentLen.toLong())
        if (seqLen < 0) throw ParserException(seqLen, "UR_ERR")
        return UrEncoder(seqLen) {
            val n = call("parser_ur_encode_next")
            if (n < 0) throw ParserException(n, "UR_ERR")
            String(bytes(call("parser_input"), n))
        }
    }


    fun urEncode(psbtLen: Int, fragmentLen: Int = 100): UrEncoder {
        val seqLen = call("parser_ur_encode_start", psbtLen.toLong(), fragmentLen.toLong())
        if (seqLen < 0) throw ParserException(seqLen, "UR_ERR")
        return UrEncoder(seqLen) {
            val n = call("parser_ur_encode_next")
            if (n < 0) throw ParserException(n, "UR_ERR")
            String(bytes(call("parser_input"), n))
        }
    }


    /** Anti-exfil: per input, 1 then the coordinator's n, 16 x 33 bytes, for Signer.sign() */
    fun nonces(): ByteArray = bytes(call("parser_nonces"), 33 * L.MAX_INPUTS)

    fun finalize(sigs: List<Signature>): ByteArray {
        require(sigs.size <= L.MAX_INPUTS) { "${sigs.size} signatures, a plan has at most ${L.MAX_INPUTS} inputs" }
        for (s in sigs) {
            require(s.input in 0 until L.MAX_INPUTS && s.pubkey.size == 33 && s.sig.size <= 73) {
                "input ${s.input}: a signature slot takes a 33-byte pubkey and at most 73 bytes of signature"
            }
        }
        val base = call("parser_sigs")
        val points = call("parser_nonce_points")
        instance.write(base, ByteArray(L.SIG_SIZE * L.MAX_INPUTS))
        instance.write(points, ByteArray(33 * L.MAX_INPUTS))
        sigs.forEachIndexed { i, s ->
            val o = base + i * L.SIG_SIZE
            s.point?.let { instance.write(points + i * 33, it) }
            instance.write(o, byteArrayOf(s.input.toByte()))
            instance.write(o + 1, s.pubkey)
            instance.write(o + 34, byteArrayOf(s.sig.size.toByte()))
            instance.write(o + 35, s.sig)
        }
        val len = call("parser_finalize", sigs.size.toLong())
        if (len < 0) throw ParserException(-len)
        return bytes(call("parser_output"), len)
    }

    override fun close() = instance.close()
}
