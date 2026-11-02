package app.bithanko.signer

import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import wasmsigner.Display
import wasmsigner.Review

/** A separate model of the review, deciding the same plan from signer.wasm's facts.
 *  A review is shown only when both reach the same totals, inputs to sign, owners and screen. */
internal class CheckerReview(wasm: ByteArray) : AutoCloseable {
    init {
        val got = java.security.MessageDigest.getInstance("SHA-256").digest(wasm).joinToString("") { "%02x".format(it) }
        require(got == CHECKER_SHA256) { "checker.wasm is not the expected build: $got != $CHECKER_SHA256" }
    }

    private val module = WasmiModule(wasm)

    init {
        for (n in listOf("checker_input", "checker_output", "checker_run_plan"))
            require(module.hasExport(n)) { "not a checker.wasm module: $n missing" }
    }

    fun agrees(plan: ByteArray, facts: ByteArray, prevTxs: List<ByteArray?>, review: Review, display: Display): Boolean {
        val nIn = minOf(plan[16].toInt() and 0xff, 16)
        val nOut = minOf(plan[17].toInt() and 0xff, 16)
        val input = ByteArrayOutputStream()
        input.write(plan)
        input.write(facts)
        for (i in 0 until nIn) {
            val raw = prevTxs.getOrNull(i) ?: ByteArray(0)
            input.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(raw.size).array())
            input.write(raw)
        }
        val bytes = input.toByteArray()
        val texts = display.outputs.map { it.text.toByteArray(Charsets.US_ASCII) }
        val expected = ByteBuffer.allocate(33 + nIn + nOut + texts.sumOf { 10 + it.size }).order(ByteOrder.LITTLE_ENDIAN)
            .put(0).putLong(review.totalIn).putLong(review.totalOut).putLong(review.fee)
        for (i in 0 until nIn) expected.put(if (review.willSign[i]) 1 else 0)
        for (i in 0 until nOut) expected.put(review.owner[i].ordinal.toByte())
        // and the screen: spend, then each output's amount, kind of text and text
        expected.putLong(display.spend)
        for ((o, t) in display.outputs.zip(texts)) expected.putLong(o.amount).put(o.textKind.ordinal.toByte()).put(t.size.toByte()).put(t)
        // A trap in checker.wasm is a refusal like any other disagreement
        val got = runCatching {
            module.write(module.call("checker_input").toInt(), bytes)
            val n = module.call("checker_run_plan", bytes.size.toLong()).toInt()
            if (n <= 0) ByteArray(0) else module.readBytes(module.call("checker_output").toInt(), n)
        }.getOrDefault(ByteArray(0))
        return got.contentEquals(expected.array())
    }

    override fun close() = module.close()

    companion object {
        const val CHECKER_SHA256 = "579bf43d0652ed8152fae6d2ad2b0bf97afb9422e96b0d9e3658a3bd9f2a5912"
    }
}
