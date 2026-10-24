package com.diysigner.bitwasm_signer.signer

internal object WasmiNative {
    init { System.loadLibrary("bitwasm_signer_app_lib") }

    external fun create(wasm: ByteArray): Long
    external fun close(handle: Long)
    external fun memorySize(handle: Long): Int
    external fun hasExport(handle: Long, name: String): Boolean
    external fun call(handle: Long, name: String, args: LongArray): Long
    external fun read(handle: Long, offset: Int, length: Int): ByteArray
    external fun write(handle: Long, offset: Int, bytes: ByteArray)
}

internal class WasmiModule(wasm: ByteArray) : AutoCloseable {
    private var handle = WasmiNative.create(wasm)

    val memorySize: Int
        @Synchronized get() = WasmiNative.memorySize(activeHandle())

    @Synchronized
    fun hasExport(name: String): Boolean = WasmiNative.hasExport(activeHandle(), name)

    @Synchronized
    fun call(name: String, vararg args: Long): Long = WasmiNative.call(activeHandle(), name, args)

    @Synchronized
    fun readBytes(offset: Int, length: Int): ByteArray = WasmiNative.read(activeHandle(), offset, length)

    @Synchronized
    fun write(offset: Int, bytes: ByteArray) = WasmiNative.write(activeHandle(), offset, bytes)

    @Synchronized
    override fun close() {
        if (handle != 0L) {
            WasmiNative.close(handle)
            handle = 0
        }
    }

    private fun activeHandle(): Long {
        check(handle != 0L) { "WASM module is closed" }
        return handle
    }
}
