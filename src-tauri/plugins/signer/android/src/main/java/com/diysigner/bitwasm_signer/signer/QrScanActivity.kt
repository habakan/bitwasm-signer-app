package com.diysigner.bitwasm_signer.signer

import android.app.Activity
import android.graphics.Canvas
import android.graphics.Paint
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import wasmpsbt.Parser
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class QrScanActivity : AppCompatActivity() {
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private val accepted = AtomicBoolean(false)
    private lateinit var previewView: PreviewView
    private lateinit var status: TextView
    private var parser: Parser? = null
    private val psbtMode get() = intent.getStringExtra("mode") == "psbt"
    private val multisigMode get() = intent.getStringExtra("mode") == "multisig"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val p = Design.palette(this)
        val tr = Design::tr
        Design.styleWindow(window, p)
        previewView = PreviewView(this)
        val cancel = { setResult(Activity.RESULT_CANCELED); finish() }
        val (title, term, help) = when {
            multisigMode -> Triple(tr("マルチシグの設定を読み取る", "Scan a multisig setup"), tr("BSMS・ディスクリプター", "BSMS or descriptor"),
                tr("ディスクリプター、BSMS、Coldcardの書き出し、またはアニメーションQR(ur:crypto-output・ur:bytes)を読み取ります。", "Show a descriptor, BSMS or Coldcard export, or an animated ur:crypto-output or legacy ur:bytes QR."))
            psbtMode -> Triple(tr("取引のQRを読み取る", "Scan the transaction QR"), "UR crypto-psbt",
                tr("ウォレットアプリのアニメーションQRをカメラに向けてください。読み取りは自動で進みます。", "Point the camera at your wallet app's animated QR. Scanning continues as frames arrive."))
            else -> Triple(tr("バックアップのQRを読み取る", "Scan your backup QR"), tr("SeedQR・CompactSeedQR・64バイトのシード", "SeedQR, CompactSeedQR or a 64-byte seed"),
                tr("鍵はこのスマホの中でだけ用意します。読み取った内容は表示しません。", "The key is prepared on this phone only. What is scanned is never shown."))
        }
        status = Design.text(this, if (psbtMode || multisigMode) tr("QRを待っています", "Waiting for the QR") else tr("QRを枠の中に合わせてください", "Fit the QR inside the frame"),
            Design.Style.LABEL, p.ink)
        val heading = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16.dp, 20.dp, 16.dp, 16.dp)
            addView(Design.text(this@QrScanActivity, title, Design.Style.DISPLAY, p.ink))
            addView(Design.text(this@QrScanActivity, term, Design.Style.CAPTION, p.inkMuted), LinearLayout.LayoutParams(-1, -2).apply { topMargin = 4.dp })
        }
        val stage = FrameLayout(this).apply {
            addView(previewView, FrameLayout.LayoutParams(-1, -1))
            addView(ScanFrameView(this@QrScanActivity, p.iconWell), FrameLayout.LayoutParams(240.dp, 240.dp, Gravity.CENTER))
        }
        val footer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16.dp, 16.dp, 16.dp, 16.dp)
            addView(status)
            addView(Design.text(this@QrScanActivity, help, Design.Style.CAPTION, p.inkMuted), LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8.dp })
            addView(Design.button(this@QrScanActivity, tr("キャンセル", "Cancel"), false, p).apply { setOnClickListener { cancel() } },
                LinearLayout.LayoutParams(-1, -2).apply { topMargin = 16.dp })
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(p.surface)
            addView(Design.topBar(this@QrScanActivity, p, tr("読み取り", "Scan"), intent.getBooleanExtra("testnet", false), cancel))
            addView(heading)
            addView(stage, LinearLayout.LayoutParams(-1, 0, 1f))
            addView(Design.divider(this@QrScanActivity, p), LinearLayout.LayoutParams(-1, 1.dp))
            addView(footer)
        })
        startCamera()
    }

    private val Int.dp get() = Design.dp(this@QrScanActivity, this)
    private fun receiving(progress: Any) = Design.tr("受信中・$progress", "Receiving frames · $progress")

    private fun startCamera() {
        val providerFuture = ProcessCameraProvider.getInstance(this)
        providerFuture.addListener({
            val provider = providerFuture.get()
            val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
            val scanner = BarcodeScanning.getClient()
            val analysis = ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                val media = imageProxy.image
                if (media == null || accepted.get()) { imageProxy.close(); return@setAnalyzer }
                scanner.process(InputImage.fromMediaImage(media, imageProxy.imageInfo.rotationDegrees))
                    .addOnSuccessListener { codes ->
                        val barcode = codes.firstOrNull { it.format == Barcode.FORMAT_QR_CODE } ?: return@addOnSuccessListener
                        if (multisigMode) barcode.rawValue?.let(::acceptMultisig)
                        else if (psbtMode) barcode.rawValue?.let(::acceptPsbt)
                        else acceptSeedQr(barcode)
                    }
                    .addOnFailureListener { error -> runOnUiThread { status.text = error.message ?: Design.tr("QRを読み取れませんでした", "Could not read the QR code") } }
                    .addOnCompleteListener { imageProxy.close() }
            }
            provider.unbindAll()
            provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
        }, ContextCompat.getMainExecutor(this))
    }

    private fun acceptSeedQr(barcode: Barcode) {
        val rawBytes = barcode.rawBytes?.copyOf()
        val rawValue = barcode.rawValue?.toByteArray(Charsets.UTF_8)
        val bounds = barcode.boundingBox
        val candidatesEqual = if (rawBytes != null && rawValue != null) rawBytes.contentEquals(rawValue).toString() else "n/a"
        val scanInfo = "valueType=${barcode.valueType}, bounds=${bounds?.width() ?: 0}x${bounds?.height() ?: 0}, rawBytes=${rawBytes?.size ?: 0}, rawValueBytes=${rawValue?.size ?: 0}, candidatesEqual=$candidatesEqual"
        if (rawBytes == null && rawValue == null) {
            runOnUiThread { status.text = Design.tr("QRの中身を読み取れませんでした", "The QR had no data") + " ($scanInfo)" }
            return
        }
        if (accepted.compareAndSet(false, true)) {
            rawBytes?.let { intent.putExtra(PAYLOAD_BYTES, it) }
            rawValue?.let { intent.putExtra(PAYLOAD_TEXT_BYTES, it) }
            setResult(Activity.RESULT_OK, intent.putExtra(SCAN_INFO, scanInfo))
            finish()
        } else {
            rawBytes?.fill(0)
            rawValue?.fill(0)
        }
    }

    private fun activeParser() = parser ?: run {
        val wasm = assets.open("parser.wasm").use { it.readBytes() }
        try { Parser(wasm, SignerEngine.PARSER_SHA256) } finally { wasm.fill(0) }
    }.also { parser = it }

    // Plain text setups use one QR; animated setup payloads use crypto-output or legacy bytes URs.
    private fun acceptMultisig(value: String) {
        try {
            var kind = "text"
            val payload = if (value.startsWith("ur:", ignoreCase = true)) {
                val activeParser = activeParser()
                val complete = activeParser.urReceive(value)
                if (complete == null) { runOnUiThread { status.text = receiving(activeParser.urProgress) }; return }
                kind = activeParser.urKind
                require(kind == "bytes" || kind == "crypto-output") { Design.tr("このURはマルチシグの設定ではありません", "This UR is not a multisig setup") }
                complete
            } else value.toByteArray()
            if (accepted.compareAndSet(false, true)) {
                finishWith(android.util.Base64.encodeToString(payload, android.util.Base64.NO_WRAP), kind)
            }
        } catch (e: Exception) {
            runOnUiThread { status.text = e.message ?: Design.tr("マルチシグのQRを読み取れませんでした", "Could not read the multisig QR code") }
        }
    }

    private fun acceptPsbt(value: String) {
        try {
            val activeParser = activeParser()
            val complete = activeParser.urReceive(value)
            if (complete != null && accepted.compareAndSet(false, true)) finishWith(android.util.Base64.encodeToString(complete, android.util.Base64.NO_WRAP))
            else runOnUiThread { status.text = receiving(activeParser.urProgress) }
        } catch (e: Exception) {
            runOnUiThread { status.text = e.message ?: Design.tr("取引のQRを読み取れませんでした", "Could not read the PSBT QR code") }
        }
    }

    private fun finishWith(payload: String, kind: String? = null) {
        val result = intent.putExtra(PAYLOAD, payload)
        kind?.let { result.putExtra(PAYLOAD_KIND, it) }
        setResult(Activity.RESULT_OK, result)
        finish()
    }

    override fun onDestroy() {
        parser?.close()
        cameraExecutor.shutdown()
        super.onDestroy()
    }

    companion object {
        const val PAYLOAD = "payload"
        const val PAYLOAD_KIND = "payload_kind"
        const val PAYLOAD_BYTES = "payload_bytes"
        const val PAYLOAD_TEXT_BYTES = "payload_text_bytes"
        const val SCAN_INFO = "scan_info"
    }
}

private class ScanFrameView(context: android.content.Context, frameColor: Int) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = frameColor
        strokeWidth = 3f * resources.displayMetrics.density
        style = Paint.Style.STROKE
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val inset = paint.strokeWidth / 2
        val radius = DesignTokens.RADIUS_LG * resources.displayMetrics.density
        canvas.drawRoundRect(inset, inset, width - inset, height - inset, radius, radius, paint)
    }
}
