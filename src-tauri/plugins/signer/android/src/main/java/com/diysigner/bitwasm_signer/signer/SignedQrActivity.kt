package com.diysigner.bitwasm_signer.signer

import android.app.Activity
import android.graphics.Bitmap
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter

class SignedQrActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var frames: ArrayList<String>
    private lateinit var image: ImageView
    private lateinit var count: TextView
    private lateinit var brightness: TextView
    private lateinit var progress: LinearLayout
    private var currentBitmap: Bitmap? = null
    private var index = 0
    private var qrLevel = 0
    private lateinit var p: Palette
    private val rotate = object : Runnable {
        override fun run() {
            showFrame()
            handler.postDelayed(this, intent.getLongExtra("interval", 350))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        p = Design.palette(this)
        val tr = Design::tr
        Design.styleWindow(window, p)
        frames = intent.getStringArrayListExtra(FRAMES) ?: arrayListOf()
        val rawPayload = intent.getByteArrayExtra(QR_BYTES)
        if (frames.isEmpty() && rawPayload == null) { setResult(Activity.RESULT_CANCELED); finish(); return }
        if (frames.isEmpty()) frames.add("")
        if (intent.getBooleanExtra("secretQr", false)) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        val account = intent.getBooleanExtra("accountQr", false)
        val secret = intent.getBooleanExtra("secretQr", false)
        image = ImageView(this).apply { adjustViewBounds = true; scaleType = ImageView.ScaleType.FIT_CENTER }
        count = Design.text(this, "", Design.Style.CAPTION, p.inkMuted).apply { gravity = Gravity.CENTER }
        brightness = Design.text(this, "4/4", Design.Style.DATA, p.ink).apply { gravity = Gravity.CENTER }
        progress = LinearLayout(this)
        repeat(minOf(frames.size, 6)) { index ->
            progress.addView(View(this).apply { setBackgroundColor(p.line) },
                LinearLayout.LayoutParams(0, 4.dp, 1f).apply { if (index > 0) leftMargin = 4.dp })
        }
        val brightnessRow = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            addView(Design.text(this@SignedQrActivity, tr("QRの明るさ", "QR brightness"), Design.Style.CAPTION, p.inkMuted), LinearLayout.LayoutParams(0, -2, 1f))
            addView(brightnessButton("−") { adjustBrightness(1) }, LinearLayout.LayoutParams(48.dp, 44.dp))
            addView(brightness, LinearLayout.LayoutParams(48.dp, -2))
            addView(brightnessButton("+") { adjustBrightness(-1) }, LinearLayout.LayoutParams(48.dp, 44.dp))
        }
        val heading = intent.getStringExtra("heading") ?: tr("ウォレットアプリで読み取ってください", "Scan this with your wallet app")
        val description = intent.getStringExtra("description") ?: tr("読み取りが終わったら、ウォレットアプリから送金してください。", "When it has scanned, send the payment from your wallet app.")
        val note = when {
            secret -> tr("このQRは人に見せないでください。読み取った人は、この鍵を使えます。", "Keep this QR private. Anyone who scans it can access the seed.")
            account -> tr("秘密鍵は含まれていません。", "No private keys are included.")
            else -> tr("読み取れないときは、QRの明るさを下げてください。", "Lower the brightness if the QR will not scan.")
        }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16.dp, 24.dp, 16.dp, 16.dp)
            addView(Design.text(this@SignedQrActivity, heading, Design.Style.DISPLAY, p.ink))
            addView(Design.text(this@SignedQrActivity, description, Design.Style.BODY, p.inkMuted), LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8.dp })
            addView(FrameLayout(this@SignedQrActivity).apply {
                setPadding(12.dp, 12.dp, 12.dp, 12.dp)
                background = Design.shape(this@SignedQrActivity, QR_WHITE[0], p.line)
                addView(image, FrameLayout.LayoutParams(-1, -1, Gravity.CENTER))
            }, LinearLayout.LayoutParams(-1, 0, 1f).apply { topMargin = 16.dp; bottomMargin = 16.dp })
            addView(progress, LinearLayout.LayoutParams(-1, 4.dp))
            addView(count, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8.dp })
            addView(brightnessRow, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8.dp })
            addView(Design.text(this@SignedQrActivity, note, Design.Style.CAPTION, if (secret) p.danger else p.inkMuted), LinearLayout.LayoutParams(-1, -2).apply { topMargin = 4.dp })
        }
        val done = Design.button(this, tr("完了", "Done"), true, p).apply { setOnClickListener { setResult(Activity.RESULT_OK); finish() } }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(p.surface)
            addView(Design.topBar(this@SignedQrActivity, p, if (account || secret) heading else tr("署名済み", "Signed"), intent.getBooleanExtra("testnet", false)))
            addView(content, LinearLayout.LayoutParams(-1, 0, 1f))
            addView(Design.divider(this@SignedQrActivity, p), LinearLayout.LayoutParams(-1, 1.dp))
            addView(LinearLayout(this@SignedQrActivity).apply {
                setPadding(16.dp, 16.dp, 16.dp, 16.dp)
                addView(done, LinearLayout.LayoutParams(-1, -2))
            })
        })
    }

    private fun showFrame() {
        val current = index
        val raw = intent.getByteArrayExtra(QR_BYTES)
        val hints = if (intent.getBooleanExtra("binaryQr", false))
            mapOf(com.google.zxing.EncodeHintType.CHARACTER_SET to "ISO-8859-1") else emptyMap()
        val value = raw?.let { String(it, Charsets.ISO_8859_1) } ?: frames[current]
        val matrix = MultiFormatWriter().encode(value, BarcodeFormat.QR_CODE, 420, 420, hints)
        val white = QR_WHITE[qrLevel]
        val pixels = IntArray(420 * 420) { p -> if (matrix[p % 420, p / 420]) QR_DARK else white }
        currentBitmap?.eraseColor(0)
        // createBitmap(pixels, ...) is immutable and eraseColor on it throws
        currentBitmap = Bitmap.createBitmap(420, 420, Bitmap.Config.ARGB_8888).apply { setPixels(pixels, 0, 420, 0, 0, 420, 420) }
        pixels.fill(0)
        image.setImageBitmap(currentBitmap)
        val account = intent.getBooleanExtra("accountQr", false)
        val name = intent.getStringExtra("qrName") ?: if (account) listOf("xpub", "descriptor").getOrElse(current) { "account" } else "UR crypto-psbt"
        val frameCount = if (raw != null) 1 else frames.size
        count.text = Design.tr("${name}・${current + 1} / $frameCount・自動で切り替え", "$name · ${current + 1} / $frameCount · auto")
        val segment = (current * progress.childCount / frameCount).coerceIn(0, progress.childCount - 1)
        for (i in 0 until progress.childCount) {
            progress.getChildAt(i).setBackgroundColor(if (i <= segment) p.primary else p.line)
        }
        brightness.text = "${4 - qrLevel}/4"
        index = (index + 1) % frames.size
    }

    private fun adjustBrightness(delta: Int) {
        qrLevel = (qrLevel + delta).coerceIn(0, QR_WHITE.lastIndex)
        showFrame()
    }

    private fun brightnessButton(text: String, onClick: () -> Unit) = Design.button(this, text, false, p).apply {
        minHeight = 0
        minimumHeight = 0
        setPadding(0, 0, 0, 0)
        setOnClickListener { onClick() }
    }

    private val Int.dp get() = Design.dp(this@SignedQrActivity, this)

    override fun onResume() { super.onResume(); handler.post(rotate) }
    override fun onPause() { handler.removeCallbacks(rotate); super.onPause() }

    override fun onDestroy() {
        intent.getByteArrayExtra(QR_BYTES)?.fill(0)
        currentBitmap?.eraseColor(0)
        currentBitmap = null
        if (::image.isInitialized) image.setImageDrawable(null)
        frames.clear()
        super.onDestroy()
    }

    companion object {
        private const val QR_DARK = 0xff111111.toInt()
        private val QR_WHITE = intArrayOf(0xffffffff.toInt(), 0xffbebebe.toInt(), 0xff828282.toInt(), 0xff505050.toInt())
        const val FRAMES = "frames"
        const val QR_BYTES = "qr_bytes"
    }
}
