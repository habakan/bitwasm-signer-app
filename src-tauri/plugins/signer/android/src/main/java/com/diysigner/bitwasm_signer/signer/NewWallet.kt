package com.diysigner.bitwasm_signer.signer

import android.app.Activity
import android.app.Dialog
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.StateListDrawable
import android.text.SpannableString
import android.text.SpannableStringBuilder
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.text.style.StyleSpan
import android.view.HapticFeedbackConstants
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

internal const val DICE_BIASED = 2
internal const val DICE_PATTERN = 4

/**
 * The screens before a new wallet's words are shown: what is about to happen, how many words, and the dice
 * rolls when the user brings their own entropy. Each opens over the last, so Back returns to the one before.
 */
internal class NewWallet(
    private val activity: Activity,
    private val testnet: Boolean,
    private val onRandom: (words: Int) -> Unit,
    private val onDice: (rolls: ByteArray, words: Int, reset: () -> Unit) -> Unit,
    private val onCancel: () -> Unit,
) {
    private val p = Design.palette(activity)
    private val tr = Design::tr
    private val open = mutableListOf<Dialog>()

    // A walkthrough of the steps ahead, one picture a page; the last page picks how the words are made
    fun show() {
        val pages = listOf(
            Triple(tr("単語を作る", "Make the words"), tr("安全な乱数か、自分で振ったサイコロの目から、12語か24語のシードフレーズを作ります。", "Recovery words, 12 or 24 of them, come from secure random numbers or from dice you roll yourself."), 0),
            Triple(tr("紙に書き写す", "Write them down"), tr("単語を順番どおりに紙に書きます。この紙があれば、スマホをなくしてもビットコインを取り戻せます。", "Write the words on paper, in order. With that paper you can get your bitcoin back even if the phone is lost."), 1),
            Triple(tr("確かめる", "Check them"), tr("書いた単語を5問のクイズで確かめます。書き間違いがあれば、ここで気づけます。", "A five-question quiz checks what you wrote, so a slip of the pen shows up now."), 2),
            Triple(tr("始める前に", "Before you start"), tr("紙とペン、サイコロで作るならサイコロを1個用意してください。周りに人やカメラがない場所で、5〜10分ほどかかります。", "Have paper and a pen, and a die if you use dice. Find a place no one and no camera can see; it takes five to ten minutes."), 3),
        )
        var page = 0
        val art = Illustration(activity, p)
        val count = Design.text(activity, "", Design.Style.OVERLINE, p.inkMuted)
        val title = Design.text(activity, "", Design.Style.DISPLAY, p.ink)
        val body = Design.text(activity, "", Design.Style.BODY, p.inkMuted)
        val dots = LinearLayout(activity).apply { gravity = Gravity.CENTER }
        val next = Design.button(activity, tr("次へ", "Next"), true, p)
        val random = Design.button(activity, tr("安全な乱数で作る", "Use secure random"), true, p)
        val dice = Design.button(activity, tr("サイコロを振って作る", "Roll dice"), false, p)
        val footer = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
        fun render() {
            val (heading, text, scene) = pages[page]
            art.scene = scene
            count.text = "${page + 1} / ${pages.size}"
            title.text = heading
            body.text = text
            dots.removeAllViews()
            pages.indices.forEach { i ->
                dots.addView(View(activity).apply { background = Design.shape(activity, if (i == page) p.primary else p.lineStrong, radius = DesignTokens.RADIUS_FULL) },
                    LinearLayout.LayoutParams(dp(if (i == page) 20 else 8), dp(8)).apply { marginStart = dp(3); marginEnd = dp(3) })
            }
            footer.removeAllViews()
            val buttons = if (page < pages.lastIndex) listOf(next) else listOf(random, dice)
            buttons.forEachIndexed { i, b -> footer.addView(b, LinearLayout.LayoutParams(-1, -2).apply { if (i > 0) topMargin = dp(DesignTokens.SPACE_3) }) }
        }
        fun go(to: Int) { if (to in pages.indices && to != page) { page = to; render() } }
        next.setOnClickListener { go(page + 1) }
        random.setOnClickListener { chooseWords(false) }
        dice.setOnClickListener { chooseWords(true) }
        val content = column(
            art.apply { layoutParams = LinearLayout.LayoutParams(-1, dp(200)) },
            dots.spaced(16),
            count.spaced(24),
            title.spaced(8),
            body.spaced(8),
        )
        // A sideways swipe turns the page, as in the walkthroughs of other apps
        val swipe = android.view.GestureDetector(activity, object : android.view.GestureDetector.SimpleOnGestureListener() {
            override fun onDown(e: android.view.MotionEvent) = true
            override fun onFling(e1: android.view.MotionEvent?, e2: android.view.MotionEvent, vx: Float, vy: Float): Boolean {
                if (kotlin.math.abs(vx) < kotlin.math.abs(vy)) return false
                go(if (vx < 0) page + 1 else page - 1)
                return true
            }
        })
        content.setOnTouchListener { _, e -> swipe.onTouchEvent(e) }
        render()
        push(tr("新しいウォレット", "New wallet"), content, listOf(footer)) { onCancel() }.show()
    }

    // Closes every screen of the flow, once the words are made or the flow is given up
    fun close() {
        open.toList().forEach { it.setOnCancelListener(null); it.dismiss() }
        open.clear()
    }

    private fun chooseWords(withDice: Boolean) {
        fun option(words: Int, detail: String) = Design.card(activity, p).apply {
            val pad = dp(DesignTokens.SPACE_4)
            setPadding(pad, pad, pad, pad)
            isClickable = true
            isFocusable = true
            addView(Design.text(activity, tr("${words}個の単語", "$words words"), Design.Style.HEADING, p.ink))
            addView(Design.text(activity, detail, Design.Style.CAPTION, p.inkMuted).spaced(4))
            setOnClickListener { if (withDice) rollDice(words) else { close(); onRandom(words) } }
        }
        val content = column(
            Design.steps(activity, p, 1),
            Design.text(activity, tr("単語の数を選ぶ", "Choose how many words"), Design.Style.DISPLAY, p.ink).spaced(8),
            Design.text(activity, tr("どちらも安全です。24個のほうが余裕がありますが、書き写す量が倍になります。", "Both are safe. 24 words leave more margin but take twice as long to write down."),
                Design.Style.BODY, p.inkMuted).spaced(8),
            option(12, if (withDice) tr("サイコロを50回振る", "Roll a die 50 times") else tr("いちばんよく使われる長さ", "The most common length")).spaced(24),
            option(24, if (withDice) tr("サイコロを99回振る", "Roll a die 99 times") else tr("より長く、より強い", "Longer and stronger")).spaced(12),
        )
        push(tr("新しいウォレット", "New wallet"), content, emptyList()) {}.show()
    }

    private fun rollDice(words: Int) {
        val need = if (words == 12) 50 else 99
        val rolls = ByteArray(need)
        var count = 0
        val counter = Design.text(activity, "", Design.Style.LABEL, p.inkMuted)
        val history = Design.text(activity, "", Design.Style.DATA, p.ink)
        val sheet = RollSheet(activity, p, need)
        val well = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            val pad = dp(DesignTokens.SPACE_3)
            setPadding(pad, pad, pad, pad)
            background = Design.shape(activity, p.surfaceSunken, radius = DesignTokens.RADIUS_SM)
            addView(LinearLayout(activity).apply {
                gravity = Gravity.BOTTOM
                addView(history, LinearLayout.LayoutParams(0, -2, 1f))
                addView(counter)
            })
            addView(sheet, LinearLayout.LayoutParams(-1, sheet.wanted).apply { topMargin = dp(DesignTokens.SPACE_2) })
        }
        val faces = (1..6).map { face -> DieKey(activity, p, face) }
        val undo = Design.button(activity, "⌫", false, p).apply { contentDescription = tr("1つ消す", "Undo") }
        val clear = Design.button(activity, tr("全消去", "Clear"), false, p)
        val make = Design.button(activity, tr("単語を作る", "Make the words"), true, p)
        fun update() {
            counter.text = "$count / $need"
            counter.setTextColor(if (count == need) p.primary else p.inkMuted)
            sheet.rolls = rolls.copyOf(count)
            // The last ten rolls in full and how many came before, so a mistyped one is easy to spot
            val shown = (maxOf(0, count - 10) until count).joinToString(" ") { (rolls[it] - '0'.code.toByte()).toString() }
            history.text = if (count == 0) tr("出た目を下で押してください。", "Tap the face that came up.") else SpannableString(if (count > 10) "… $shown" else shown).apply {
                // The roll just entered stands out, so each tap visibly lands
                setSpan(ForegroundColorSpan(p.primary), length - 1, length, 0)
                setSpan(StyleSpan(Typeface.BOLD), length - 1, length, 0)
                setSpan(RelativeSizeSpan(1.4f), length - 1, length, 0)
            }
            faces.forEach { it.isEnabled = count < need; it.alpha = if (count < need) 1f else 0.4f }
            undo.isEnabled = count > 0
            clear.isEnabled = count > 0
            undo.alpha = if (count > 0) 1f else 0.4f
            clear.alpha = undo.alpha
            make.isEnabled = count == need
            make.alpha = if (count == need) 1f else 0.5f
        }
        faces.forEach { key ->
            key.setOnClickListener {
                if (count < need) {
                    rolls[count++] = ('0' + key.face).code.toByte()
                    key.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                    update()
                }
            }
        }
        undo.setOnClickListener { if (count > 0) { rolls[--count] = 0; update() } }
        clear.setOnClickListener {
            Design.alert(activity).setTitle(tr("入れた目を全部消しますか", "Clear every roll?"))
                .setNegativeButton(tr("キャンセル", "Cancel"), null)
                .setPositiveButton(tr("全部消す", "Clear all")) { _, _ -> rolls.fill(0); count = 0; update() }
                .create().also { d -> d.setOnShowListener { Design.styleDialog(d) } }.show()
        }
        make.setOnClickListener { onDice(rolls.copyOf(), words) { rolls.fill(0); count = 0; update() } }
        // Three faces a row, with Undo and Clear as a fourth column so the keys keep one block
        val pad = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            for (row in 0..1) addView(LinearLayout(activity).apply {
                (faces.subList(row * 3, row * 3 + 3) + (if (row == 0) undo else clear)).forEachIndexed { col, key ->
                    addView(key, LinearLayout.LayoutParams(0, dp(56), if (col < 3) 1f else 0.8f).apply { if (col > 0) marginStart = dp(DesignTokens.SPACE_2) })
                }
            }, LinearLayout.LayoutParams(-1, -2).apply { if (row > 0) topMargin = dp(DesignTokens.SPACE_2) })
        }
        val content = column(
            Design.steps(activity, p, 1),
            Design.text(activity, tr("1回振るごとに、出た目を押してください。ちょうど${need}回で単語になります。", "After each roll, tap the face that came up. Exactly $need rolls make the words."),
                Design.Style.BODY, p.inkMuted).spaced(12),
            well.spaced(12),
            View(activity).apply { layoutParams = LinearLayout.LayoutParams(-1, 0, 1f) },
            pad.spaced(12),
        )
        // Not scrolled: a scroll moving under the finger would put the next roll on the wrong face
        val dialog = push(tr("サイコロ", "Dice"), content, listOf(make), scroll = false) { rolls.fill(0) }
        dialog.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        update()
        dialog.show()
    }

    private fun push(title: String, content: View, actions: List<View>, scroll: Boolean = true, onBack: () -> Unit): Dialog {
        lateinit var dialog: Dialog
        dialog = Design.screen(activity, title, testnet, if (scroll) ScrollView(activity).apply { addView(content) } else content, actions) {
            open.remove(dialog)
            onBack()
        }
        open.add(dialog)
        return dialog
    }

    private fun column(vararg views: View) = LinearLayout(activity).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(24), dp(16), dp(24))
        views.forEach { addView(it, it.layoutParams ?: LinearLayout.LayoutParams(-1, -2)) }
    }

    private fun View.spaced(top: Int) = apply { layoutParams = LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(top) } }

    private fun dp(value: Int) = Design.dp(activity, value)
}

// A die face drawn with its pips, so it reads the same as the die on the table
private class DieKey(context: Context, private val p: Palette, val face: Int) : FrameLayout(context) {
    private val pip = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = p.ink }

    init {
        background = StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_pressed), Design.shape(context, p.primarySoft, p.primary, DesignTokens.RADIUS_MD))
            addState(intArrayOf(), Design.shape(context, p.surfaceRaised, p.lineStrong, DesignTokens.RADIUS_MD))
        }
        isClickable = true
        isFocusable = true
        contentDescription = face.toString()
        setWillNotDraw(false)
    }

    override fun setPressed(pressed: Boolean) {
        super.setPressed(pressed)
        animate().scaleX(if (pressed) 0.92f else 1f).scaleY(if (pressed) 0.92f else 1f).setDuration(80).start()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val side = minOf(width, height) * 0.6f
        val left = (width - side) / 2
        val top = (height - side) / 2
        val spots = mapOf(
            1 to listOf(1 to 1), 2 to listOf(0 to 0, 2 to 2), 3 to listOf(0 to 0, 1 to 1, 2 to 2),
            4 to listOf(0 to 0, 2 to 0, 0 to 2, 2 to 2), 5 to listOf(0 to 0, 2 to 0, 1 to 1, 0 to 2, 2 to 2),
            6 to listOf(0 to 0, 2 to 0, 0 to 1, 2 to 1, 0 to 2, 2 to 2),
        )
        spots.getValue(face).forEach { (x, y) -> canvas.drawCircle(left + side * (x + 0.5f) / 3, top + side * (y + 0.5f) / 3, side / 10, pip) }
    }
}

// The walkthrough's pictures, drawn on a 240 x 160 grid in the theme's colors so they follow light and dark
private class Illustration(context: Context, private val p: Palette) : View(context) {
    var scene = 0
        set(value) { field = value; invalidate() }
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val k = minOf(width / 240f, height / 160f)
        canvas.drawRoundRect(0f, 0f, width.toFloat(), height.toFloat(), 16 * k, 16 * k, fill(p.surfaceSunken))
        canvas.translate((width - 240 * k) / 2, (height - 160 * k) / 2)
        canvas.scale(k, k)
        when (scene) {
            0 -> { die(canvas, 34f, 48f, 64f, -12f); arrow(canvas, 112f, 80f); listOf(46f, 72f, 98f).forEach { word(canvas, 140f, it, 72f) } }
            1 -> { sheet(canvas, 64f, 22f, 104f, 120f); pencil(canvas) }
            2 -> {
                canvas.drawRoundRect(48f, 22f, 192f, 138f, 12f, 12f, fill(p.surfaceRaised)); canvas.drawRoundRect(48f, 22f, 192f, 138f, 12f, 12f, stroke(p.line, 2f))
                canvas.drawRoundRect(62f, 34f, 132f, 42f, 4f, 4f, fill(p.lineStrong))
                for (i in 0..3) {
                    val x = 62f + (i % 2) * 62; val y = 56f + (i / 2) * 36
                    val right = i == 2
                    canvas.drawRoundRect(x, y, x + 54, y + 26, 13f, 13f, fill(if (right) p.primary else p.surfaceSunken))
                    if (right) check(canvas, x + 27, y + 13, p.onPrimary) else canvas.drawRoundRect(x + 12, y + 11, x + 42, y + 15, 2f, 2f, fill(p.lineStrong))
                }
            }
            else -> {
                sheet(canvas, 26f, 40f, 64f, 80f)
                die(canvas, 104f, 56f, 44f, 8f)
                canvas.drawCircle(196f, 80f, 26f, fill(p.surfaceRaised)); canvas.drawCircle(196f, 80f, 26f, stroke(p.danger, 3f))
                canvas.drawOval(180f, 72f, 212f, 88f, stroke(p.ink, 2.5f)); canvas.drawCircle(196f, 80f, 4f, fill(p.ink))
                canvas.drawLine(178f, 98f, 214f, 62f, stroke(p.danger, 3f))
            }
        }
    }

    private fun fill(color: Int) = paint.apply { style = Paint.Style.FILL; this.color = color }
    private fun stroke(color: Int, w: Float) = paint.apply { style = Paint.Style.STROKE; strokeWidth = w; strokeCap = Paint.Cap.ROUND; this.color = color }

    private fun die(canvas: Canvas, x: Float, y: Float, side: Float, angle: Float) {
        canvas.save(); canvas.rotate(angle, x + side / 2, y + side / 2)
        canvas.drawRoundRect(x, y, x + side, y + side, side / 6, side / 6, fill(p.surfaceRaised)); canvas.drawRoundRect(x, y, x + side, y + side, side / 6, side / 6, stroke(p.ink, 2.5f))
        listOf(0 to 0, 2 to 0, 1 to 1, 0 to 2, 2 to 2).forEach { (i, j) -> canvas.drawCircle(x + side * (i + 1) / 4, y + side * (j + 1) / 4, side / 14, fill(p.ink)) }
        canvas.restore()
    }

    private fun arrow(canvas: Canvas, x: Float, y: Float) {
        canvas.drawLine(x, y, x + 18, y, stroke(p.accent, 3f)); canvas.drawLine(x + 12, y - 6, x + 18, y, stroke(p.accent, 3f)); canvas.drawLine(x + 12, y + 6, x + 18, y, stroke(p.accent, 3f))
    }

    private fun word(canvas: Canvas, x: Float, y: Float, w: Float) {
        canvas.drawRoundRect(x, y, x + w, y + 18, 9f, 9f, fill(p.surfaceRaised)); canvas.drawRoundRect(x, y, x + w, y + 18, 9f, 9f, stroke(p.line, 1.5f))
        canvas.drawRoundRect(x + 10, y + 7, x + w - 18, y + 11, 2f, 2f, fill(p.inkMuted))
    }

    private fun sheet(canvas: Canvas, x: Float, y: Float, w: Float, h: Float) {
        canvas.drawRoundRect(x, y, x + w, y + h, 6f, 6f, fill(p.surfaceRaised)); canvas.drawRoundRect(x, y, x + w, y + h, 6f, 6f, stroke(p.lineStrong, 2f))
        val rows = (h / 20).toInt() - 1
        for (r in 0 until rows) {
            val ly = y + 16 + r * 18
            canvas.drawCircle(x + 12, ly, 3f, fill(p.iconWell))
            canvas.drawRoundRect(x + 20, ly - 2, x + w - 12 - (r % 3) * 10, ly + 2, 2f, 2f, fill(p.inkMuted))
        }
    }

    private fun pencil(canvas: Canvas) {
        canvas.save(); canvas.rotate(-40f, 176f, 112f)
        canvas.drawRoundRect(150f, 104f, 206f, 120f, 3f, 3f, fill(p.accent))
        canvas.drawRect(144f, 104f, 152f, 120f, fill(p.surfaceRaised)); canvas.drawRect(144f, 104f, 152f, 120f, stroke(p.ink, 1.5f))
        canvas.drawLine(136f, 112f, 144f, 104f, stroke(p.ink, 2f)); canvas.drawLine(136f, 112f, 144f, 120f, stroke(p.ink, 2f))
        canvas.restore()
    }

    private fun check(canvas: Canvas, cx: Float, cy: Float, color: Int) {
        canvas.drawLine(cx - 7, cy, cx - 2, cy + 5, stroke(color, 3f)); canvas.drawLine(cx - 2, cy + 5, cx + 8, cy - 5, stroke(color, 3f))
    }
}

// The rolls as a mark sheet: one column a roll, one row a face, with each face's count as a bar on the right.
// Fifty columns a band, so 99 rolls take two
private class RollSheet(context: Context, private val p: Palette, private val need: Int) : View(context) {
    var rolls = ByteArray(0)
        set(value) { field.fill(0); field = value; invalidate() }
    private val bands = (need + 49) / 50
    private val row = Design.dp(context, if (bands == 1) 11 else 9).toFloat()
    private val gap = Design.dp(context, 10).toFloat()
    val wanted = (bands * 6 * row + (bands - 1) * gap).toInt()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = Design.dp(context, 8).toFloat(); typeface = Typeface.MONOSPACE }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val d = resources.displayMetrics.density
        val label = 12 * d
        val bars = 56 * d
        val column = (width - label - bars - 8 * d) / 50
        for (band in 0 until bands) {
            val top = band * (6 * row + gap)
            // Columns already rolled are filled in, so the sheet doubles as the progress bar
            val done = (rolls.size - band * 50).coerceIn(0, 50)
            paint.color = p.primary
            if (done > 0) canvas.drawRoundRect(label, top, label + done * column, top + 6 * row, 3 * d, 3 * d, paint)
            for (face in 0 until 6) {
                val y = top + face * row + row / 2
                paint.color = p.inkMuted
                canvas.drawText("${face + 1}", 0f, y + 3 * d, paint)
                for (i in band * 50 until minOf(need, band * 50 + 50)) {
                    val x = label + (i - band * 50) * column + column / 2
                    if (i < rolls.size && rolls[i] - 49 != face) continue
                    val hit = i < rolls.size
                    paint.color = if (!hit) p.lineStrong else if (i == rolls.size - 1) p.accent else p.onPrimary
                    canvas.drawCircle(x, y, if (hit) minOf(column, row) * 0.42f else d, paint)
                }
            }
            paint.color = p.line
            for (tens in 10 until minOf(50, need - band * 50) step 10) canvas.drawRect(label + tens * column - d / 2, top, label + tens * column + d / 2, top + 6 * row, paint)
        }
        // Counts as bars, against the dotted line an even die would reach
        val left = width - bars + 4 * d
        val span = bars - 22 * d
        val counts = IntArray(6).also { c -> rolls.forEach { c[it - 49]++ } }
        val scale = span / maxOf(counts.max(), need / 3)
        for (face in 0 until 6) {
            val y = face * row
            paint.color = p.iconWell
            canvas.drawRoundRect(left, y + 1.5f * d, left + maxOf(counts[face] * scale, d), y + row - 1.5f * d, 2 * d, 2 * d, paint)
            paint.color = p.inkMuted
            canvas.drawText("${counts[face]}", left + span + 3 * d, y + row - 2 * d, paint)
        }
        val even = left + need / 6f * scale
        for (y in 0 until (6 * row / (4 * d)).toInt()) canvas.drawRect(even - d / 2, y * 4 * d, even + d / 2, y * 4 * d + 2 * d, paint)
    }
}

/**
 * How the words came from the entropy, with this wallet's own values: the rolls if any, the entropy, and each
 * word's eleven bits and wordlist number, the last word's checksum bits marked. It is the seed, so it is kept off screenshots.
 */
internal fun showDerivation(activity: Activity, testnet: Boolean, words: List<String>, wordlist: List<String>, entropy: ByteArray,
                            dice: Boolean, rolls: ByteArray?, onForget: () -> Unit) {
    val p = Design.palette(activity)
    val tr = Design::tr
    fun dp(v: Int) = Design.dp(activity, v)
    val bits = entropy.size * 8
    val checksum = words.size / 3
    fun well(text: CharSequence) = Design.text(activity, text, Design.Style.DATA, p.ink).apply {
        val pad = dp(DesignTokens.SPACE_3)
        setPadding(pad, pad, pad, pad)
        background = Design.shape(activity, p.surfaceSunken, radius = DesignTokens.RADIUS_SM)
    }
    fun step(n: String, title: String) = Design.text(activity, "$n  $title", Design.Style.HEADING, p.ink)
    fun arrow(text: String) = Design.text(activity, "↓  $text", Design.Style.CAPTION, p.accentInk)
    val rollsView = well(rolls?.let { r -> String(CharArray(r.size) { r[it].toInt().toChar() }).chunked(10).joinToString("\n") }
        ?: tr("メモリから消しました。", "Cleared from memory."))
    val forget = Design.button(activity, tr("サイコロの目をメモリから消す", "Clear the rolls from memory"), false, p)
    forget.isEnabled = rolls != null
    forget.setOnClickListener { onForget(); rollsView.text = tr("メモリから消しました。", "Cleared from memory."); forget.isEnabled = false }
    val table = SpannableStringBuilder().apply {
        words.forEachIndexed { i, word ->
            val index = wordlist.indexOf(word)
            val b = index.toString(2).padStart(11, '0')
            append("%2d  ".format(i + 1))
            if (i == words.lastIndex) {
                append(b.dropLast(checksum))
                val start = length
                append(b.takeLast(checksum))
                setSpan(ForegroundColorSpan(p.accentInk), start, length, 0)
                setSpan(StyleSpan(Typeface.BOLD), start, length, 0)
            } else append(b)
            append("  %4d  %s".format(index, word))
            if (i < words.lastIndex) append("\n")
        }
    }
    val content = LinearLayout(activity).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(24), dp(16), dp(24))
        fun add(v: View, top: Int) = addView(v, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(top) })
        add(Design.text(activity, tr("この単語のでき方", "How these words were made"), Design.Style.DISPLAY, p.ink), 0)
        add(Design.text(activity, tr("あなたの単語が、どの値から、どう計算されたかを順に示します。どれも単語と同じく秘密です。", "Step by step, the values your words were computed from. Every one of them is as secret as the words."), Design.Style.BODY, p.inkMuted), 8)
        if (dice) {
            add(step("1", tr("サイコロの目(${rolls?.size ?: if (words.size == 12) 50 else 99}回)", "The rolls (${rolls?.size ?: if (words.size == 12) 50 else 99})")), 24)
            add(rollsView, 8)
            add(forget, 8)
            add(arrow(tr("目を文字として並べて SHA-256 を取り、先頭${bits}ビットを使う。SeedSigner、Krux、bitcoiner.guide/seed と同じ方法です", "SHA-256 of the rolls as text; the first $bits bits are kept. SeedSigner, Krux and bitcoiner.guide/seed do the same")), 12)
        } else {
            add(step("1", tr("安全な乱数", "Secure random")), 24)
            add(Design.text(activity, tr("スマホの OS の安全な乱数から${bits}ビットを取りました。", "$bits bits from the phone's secure random number generator."), Design.Style.BODY, p.inkMuted), 8)
            add(arrow(tr("そのまま使う", "Used as they are")), 12)
        }
        add(step("2", tr("エントロピー(${bits}ビット、16進)", "The entropy ($bits bits, in hex)")), 12)
        add(well(entropy.joinToString("") { "%02x".format(it) }.chunked(4).chunked(4).joinToString("\n") { it.joinToString(" ") }), 8)
        add(arrow(tr("SHA-256 の先頭${checksum}ビットをチェックサムとして末尾に足し、11ビットずつ${words.size}個に区切る", "The first $checksum bits of its SHA-256 go on the end as a checksum; then ${words.size} groups of 11 bits")), 12)
        add(step("3", tr("11ビットの番号と単語", "Eleven bits, a number, a word")), 12)
        add(Design.text(activity, tr("番号は 2048語の単語表(BIP39)の位置です。色の付いたビットがチェックサムです。", "The number is the place in the 2048-word BIP39 list. The coloured bits are the checksum."), Design.Style.CAPTION, p.inkMuted), 8)
        add(well(table), 8)
    }
    val close = Design.button(activity, tr("閉じる", "Close"), true, p)
    val dialog = Design.screen(activity, tr("単語のでき方", "How it was made"), testnet, ScrollView(activity).apply { addView(content) }, listOf(close)) {}
    dialog.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    close.setOnClickListener { dialog.dismiss() }
    dialog.setOnDismissListener { entropy.fill(0); table.clear() }
    dialog.show()
}
