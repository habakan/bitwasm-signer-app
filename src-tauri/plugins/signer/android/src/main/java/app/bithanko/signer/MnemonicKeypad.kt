package app.bithanko.signer

import android.app.Activity
import android.app.Dialog
import android.graphics.Typeface
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.WindowManager
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import wasmsigner.Signer

private val LENGTHS = intArrayOf(12, 15, 18, 21, 24)

/**
 * Full-screen mnemonic entry with its own A–Z keypad, so the words never pass through the system keyboard.
 * Keys that cannot continue any BIP39 word are disabled, a word commits as soon as one candidate is left,
 * and the last word is limited to the ones with a valid checksum. [module] answers all three and is unloaded on close.
 */
class MnemonicKeypad(
    private val activity: Activity,
    private val testnet: Boolean,
    private val words: List<String>,
    private val module: Signer,
    private val onCancel: () -> Unit,
    private val onDone: (CharArray) -> Unit,
) {
    private var size = 12
    private val slots = IntArray(24) { -1 }
    private var cur = 0
    private val typed = StringBuilder()
    private var lastPool: IntArray? = null

    private val p = Design.palette(activity)
    private val tr = Design::tr
    private lateinit var dialog: Dialog
    private val lengthRow = LinearLayout(activity).apply {
        setPadding(dp(4), dp(4), dp(4), dp(4))
        background = Design.shape(activity, p.surfaceSunken, radius = DesignTokens.RADIUS_MD)
    }
    private val slotGrid = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
    private val entry = Design.text(activity, "", Design.Style.HEADING, p.ink)
    private val hint = Design.text(activity, "", Design.Style.CAPTION, p.inkMuted).apply { gravity = Gravity.END }
    private val candidates = LinearLayout(activity)
    private val keys = mutableMapOf<Char, TextView>()
    private val status = Design.text(activity, "", Design.Style.CAPTION, p.inkMuted)
    private val continueButton = Design.button(activity, tr("続ける", "Continue"), true, p)

    fun show() {
        val body = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(8))
        }
        body.addView(Design.text(activity, tr("単語の数", "NUMBER OF WORDS"), Design.Style.OVERLINE, p.inkMuted))
        LENGTHS.forEach { length ->
            lengthRow.addView(Design.text(activity, "$length", Design.Style.LABEL, p.inkMuted).apply {
                gravity = Gravity.CENTER
                minHeight = dp(40)
                setOnClickListener { setSize(length) }
            }, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        }
        body.addView(lengthRow, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(8) })
        body.addView(ScrollView(activity).apply { addView(slotGrid) }, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f).apply { topMargin = dp(16) })
        body.addView(LinearLayout(activity).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(12), 0, dp(8))
            addView(entry, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
            addView(hint)
        })
        body.addView(HorizontalScrollView(activity).apply { isHorizontalScrollBarEnabled = false; addView(candidates) },
            LinearLayout.LayoutParams(MATCH_PARENT, dp(44)))
        listOf("qwertyuiop", "asdfghjkl", "zxcvbnm").forEachIndexed { row, letters ->
            body.addView(LinearLayout(activity).apply {
                gravity = Gravity.CENTER
                letters.forEach { ch -> addView(key("$ch") { press(ch) }.also { keys[ch] = it }, keyParams(1f)) }
                if (row == 2) addView(key("⌫") { back() }.apply { contentDescription = tr("1文字消す", "Delete") }, keyParams(1.6f))
            }, LinearLayout.LayoutParams(MATCH_PARENT, dp(46)).apply { topMargin = dp(6) })
        }
        body.addView(status, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(10) })

        continueButton.setOnClickListener { finish() }
        dialog = Design.screen(activity, tr("シードフレーズ", "Recovery words"), testnet, body, listOf(continueButton)) { clear(); onCancel() }
        dialog.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        render()
        dialog.show()
    }

    private fun matches(prefix: CharSequence) = module.wordMatches(prefix, lastPool).toList()

    private fun setSize(length: Int) {
        size = length
        for (i in size until slots.size) slots[i] = -1
        typed.clear()
        cur = nextEmpty(0)
        refreshLastPool()
    }

    private fun nextEmpty(from: Int) =
        (from until size).firstOrNull { slots[it] < 0 } ?: (0 until size).firstOrNull { slots[it] < 0 } ?: size

    private fun refreshLastPool() {
        lastPool = if (cur == size - 1 && (0 until size - 1).all { slots[it] >= 0 }) module.finalWords(slots.copyOf(size - 1)) else null
        render()
    }

    private fun commit(index: Int) {
        slots[cur] = index
        typed.clear()
        cur = nextEmpty(cur + 1)
        refreshLastPool()
    }

    private fun press(ch: Char) {
        typed.append(ch)
        val hits = matches(typed)
        if (hits.size == 1) commit(hits[0]) else render()
    }

    private fun back() {
        if (typed.isNotEmpty()) { typed.setLength(typed.length - 1); render(); return }
        val previous = (if (cur >= size) size else cur) - 1
        if (previous < 0) return
        slots[previous] = -1
        cur = previous
        refreshLastPool()
    }

    private fun edit(slot: Int) {
        slots[slot] = -1
        typed.clear()
        cur = slot
        refreshLastPool()
    }

    private fun render() {
        val done = cur >= size
        for (i in 0 until lengthRow.childCount) (lengthRow.getChildAt(i) as TextView).apply {
            val selected = LENGTHS[i] == size
            setTextColor(if (selected) p.ink else p.inkMuted)
            background = if (selected) Design.shape(activity, p.surfaceRaised, p.lineStrong, DesignTokens.RADIUS_SM) else null
        }

        // Down each column, like the write-down screen of a new wallet: 24 words as three columns of eight
        slotGrid.removeAllViews()
        val columns = if (size > 12) 3 else 2
        val per = (size + columns - 1) / columns
        for (row in 0 until per) slotGrid.addView(LinearLayout(activity).apply {
            for (column in 0 until columns) addView(slot(row + column * per), LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f).apply { marginEnd = dp(6) })
        }, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { bottomMargin = dp(6) })

        val hits = when {
            done -> emptyList()
            typed.isNotEmpty() -> matches(typed)
            lastPool != null -> lastPool!!.toList()
            else -> emptyList()
        }
        entry.text = if (done) "" else tr("${cur + 1}番目の単語", "Word ${cur + 1}")
        hint.text = when {
            done -> ""
            lastPool != null -> tr("チェックサムが合う${hits.size}件", "${hits.size} with a valid checksum")
            typed.isNotEmpty() -> tr("${hits.size}件の候補", "${hits.size} matches")
            else -> ""
        }
        candidates.removeAllViews()
        hits.take(24).forEach { index ->
            candidates.addView(Design.text(activity, words[index], Design.Style.DATA, p.primary).apply {
                setTypeface(typeface, Typeface.BOLD)
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(14), 0, dp(14), 0)
                background = Design.shape(activity, p.primarySoft, p.primary, DesignTokens.RADIUS_FULL)
                setOnClickListener { commit(index) }
            }, LinearLayout.LayoutParams(WRAP_CONTENT, dp(40)).apply { marginEnd = dp(8) })
        }

        val letters = if (done) 0 else module.wordLetters(typed, lastPool)
        keys.forEach { (ch, view) ->
            val enabled = (letters shr (ch - 'a')) and 1 == 1
            view.isEnabled = enabled
            view.setTextColor(if (enabled) p.ink else p.lineStrong)
            view.background = Design.shape(activity, if (enabled) p.surfaceRaised else p.surfaceSunken, if (enabled) p.line else null, DesignTokens.RADIUS_SM)
        }

        val valid = done && slots[size - 1] in module.finalWords(slots.copyOf(size - 1))
        status.text = when {
            valid -> tr("${size}個の単語・チェックサムOK", "$size words · checksum OK")
            done -> tr("チェックサムが一致しません。単語をタップして直してください。", "The checksum does not match. Tap a word to fix it.")
            else -> tr("単語をタップすると打ち直せます。紙のバックアップと同じ順番で入力してください。", "Tap a word to retype it. Enter them in the order on your paper backup.")
        }
        status.setTextColor(if (valid) p.positive else if (done) p.danger else p.inkMuted)
        continueButton.isEnabled = valid
        continueButton.alpha = if (valid) 1f else 0.45f
    }

    private fun slot(i: Int) = LinearLayout(activity).apply {
        gravity = Gravity.CENTER_VERTICAL
        setPadding(dp(6), dp(7), dp(6), dp(7))
        background = Design.shape(activity, p.surfaceRaised, if (i == cur) p.primary else p.line, DesignTokens.RADIUS_SM)
        setOnClickListener { edit(i) }
        addView(Design.text(activity, "${i + 1}", Design.Style.CAPTION, p.inkMuted).apply { gravity = Gravity.END }, LinearLayout.LayoutParams(dp(18), WRAP_CONTENT))
        // An eight letter word does not fit a third of a small phone at 14sp, so it shrinks instead of being cut off
        addView(Design.text(activity, if (i == cur) typed else slots[i].takeIf { it >= 0 }?.let { words[it] } ?: "", Design.Style.DATA, if (i == cur) p.primary else p.ink).apply {
            maxLines = 1
            setAutoSizeTextTypeUniformWithConfiguration(9, 14, 1, TypedValue.COMPLEX_UNIT_SP)
        }, LinearLayout.LayoutParams(0, dp(22), 1f).apply { marginStart = dp(6) })
    }

    private fun finish() {
        // Built straight into a CharArray so the caller can wipe it; no joined String is created
        val chosen = (0 until size).map { words[slots[it]] }
        val phrase = CharArray(chosen.sumOf { it.length } + size - 1)
        var at = 0
        chosen.forEachIndexed { i, word ->
            if (i > 0) phrase[at++] = ' '
            word.toCharArray(phrase, at)
            at += word.length
        }
        clear()
        dialog.dismiss()
        onDone(phrase)
    }

    private fun clear() {
        slots.fill(-1)
        typed.clear()
        lastPool = null
        module.unload()
    }

    private fun key(text: String, onTap: () -> Unit) = Design.text(activity, text, Design.Style.DATA, p.ink).apply {
        textSize = 16f
        gravity = Gravity.CENTER
        setOnClickListener { onTap() }
    }

    private fun keyParams(weight: Float) = LinearLayout.LayoutParams(0, MATCH_PARENT, weight).apply { marginEnd = dp(4) }

    private fun dp(value: Int) = (value * activity.resources.displayMetrics.density).toInt()
}
