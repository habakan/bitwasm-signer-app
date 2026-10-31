import { webDemo } from "../signer";
import { tr } from "../views";
import { button, choose, dialog, escape, loadWords, sheet, showFrames } from "./demo";
import { call } from "./engine";

// The new wallet flow of the phones, in the page. In the browser demo the words are made in a connected
// browser, so every screen that shows them is stamped as a demo that must never hold funds
const DICE_BIASED = 2;
const DICE_PATTERN = 4;
const STEPS: [string, string][] = [["単語を作る", "Make the words"], ["書き写す", "Write them down"], ["確かめる", "Check them"]];

const cancelled = () => tr("新しいウォレットの作成をやめました。", "Mnemonic creation was cancelled");
const words = () => call<{ words: string[] }>("wordlist").words;

function steps(current: number) {
  const [ja, en] = STEPS[current - 1];
  return `<div class="steps"><div class="steps-bars">${STEPS.map((_, i) => `<span class="${i < current ? "done" : ""}"></span>`).join("")}</div>
    <span class="overline">${tr(`${current} / 3  ${ja}`, `${current} OF 3  ${en.toUpperCase()}`)}</span></div>`;
}

// A sheet of this flow: Back in the top bar as on the phones, so the footer keeps only the step's own action
export function step(title: string, body: string, actions: string, onBack: () => void) {
  const view = sheet(title, body, actions, onBack);
  view.querySelector(".screen-body")!.classList.add("tight");
  return view;
}

const stamp = () => !webDemo ? "" : `<div class="demo-stamp" aria-hidden="true">${tr("デモ・本物の資金に使わない", "DEMO · NEVER USE FOR FUNDS")}</div>`;

// The walkthrough's pictures on the same 240 x 160 grid as the phones, in the theme's colors
function art(scene: number) {
  const die = (x: number, y: number, s: number, a: number) => `<g transform="rotate(${a} ${x + s / 2} ${y + s / 2})">
    <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s / 6}" fill="var(--surface-raised)" stroke="var(--ink)" stroke-width="2.5"/>
    ${[[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]].map(([i, j]) => `<circle cx="${x + s * (i + 1) / 4}" cy="${y + s * (j + 1) / 4}" r="${s / 14}" fill="var(--ink)"/>`).join("")}</g>`;
  const sheetArt = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--surface-raised)" stroke="var(--line-strong)" stroke-width="2"/>
    ${Array.from({ length: Math.floor(h / 20) - 1 }, (_, r) => `<circle cx="${x + 12}" cy="${y + 16 + r * 18}" r="3" fill="var(--icon-well)"/>
      <rect x="${x + 20}" y="${y + 14 + r * 18}" width="${w - 32 - (r % 3) * 10}" height="4" rx="2" fill="var(--ink-muted)"/>`).join("")}`;
  const body = [
    `${die(34, 48, 64, -12)}<path d="M112 80h18M124 74l6 6-6 6" stroke="var(--accent)" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${[46, 72, 98].map((y) => `<rect x="140" y="${y}" width="72" height="18" rx="9" fill="var(--surface-raised)" stroke="var(--line)" stroke-width="1.5"/><rect x="150" y="${y + 7}" width="44" height="4" rx="2" fill="var(--ink-muted)"/>`).join("")}`,
    `${sheetArt(64, 22, 104, 120)}<g transform="rotate(-40 176 112)"><rect x="150" y="104" width="56" height="16" rx="3" fill="var(--accent)"/>
      <rect x="144" y="104" width="8" height="16" fill="var(--surface-raised)" stroke="var(--ink)" stroke-width="1.5"/><path d="M144 104l-8 8 8 8" stroke="var(--ink)" stroke-width="2" fill="none"/></g>`,
    `<rect x="48" y="22" width="144" height="116" rx="12" fill="var(--surface-raised)" stroke="var(--line)" stroke-width="2"/><rect x="62" y="34" width="70" height="8" rx="4" fill="var(--line-strong)"/>
      ${[0, 1, 2, 3].map((i) => { const x = 62 + (i % 2) * 62, y = 56 + Math.floor(i / 2) * 36; return i === 2
        ? `<rect x="${x}" y="${y}" width="54" height="26" rx="13" fill="var(--primary)"/><path d="M${x + 20} ${y + 13}l5 5 10-10" stroke="var(--on-primary)" stroke-width="3" fill="none" stroke-linecap="round"/>`
        : `<rect x="${x}" y="${y}" width="54" height="26" rx="13" fill="var(--surface-sunken)"/><rect x="${x + 12}" y="${y + 11}" width="30" height="4" rx="2" fill="var(--line-strong)"/>`; }).join("")}`,
    `${sheetArt(26, 40, 64, 80)}${die(104, 56, 44, 8)}<circle cx="196" cy="80" r="26" fill="var(--surface-raised)" stroke="var(--danger)" stroke-width="3"/>
      <ellipse cx="196" cy="80" rx="16" ry="8" fill="none" stroke="var(--ink)" stroke-width="2.5"/><circle cx="196" cy="80" r="4" fill="var(--ink)"/>
      <path d="M178 98L214 62" stroke="var(--danger)" stroke-width="3" stroke-linecap="round"/>`,
  ][scene];
  return `<svg class="walk-art" viewBox="0 0 240 160" aria-hidden="true">${body}</svg>`;
}

function walkthrough(): Promise<"random" | "dice"> {
  const pages: [string, string][] = [
    [tr("単語を作る", "Make the words"), tr("安全な乱数か、自分で振ったサイコロの目から、12語か24語のシードフレーズを作ります。", "Recovery words, 12 or 24 of them, come from secure random numbers or from dice you roll yourself.")],
    [tr("紙に書き写す", "Write them down"), tr("単語を順番どおりに紙に書きます。この紙があれば、スマホをなくしてもビットコインを取り戻せます。", "Write the words on paper, in order. With that paper you can get your bitcoin back even if the phone is lost.")],
    [tr("確かめる", "Check them"), tr("書いた単語を5問のクイズで確かめます。書き間違いがあれば、ここで気づけます。", "A five-question quiz checks what you wrote, so a slip of the pen shows up now.")],
    [tr("始める前に", "Before you start"), tr("紙とペン、サイコロで作るならサイコロを1個用意してください。周りに人やカメラがない場所で、5〜10分ほどかかります。", "Have paper and a pen, and a die if you use dice. Find a place no one and no camera can see; it takes five to ten minutes.")],
  ];
  let leave = () => {};
  const view = step(tr("新しいウォレット", "New wallet"), `<div class="walk"></div>`, button("walk-next", tr("次へ", "Next"), "primary"), () => leave());
  const walk = view.querySelector<HTMLElement>(".walk")!;
  const footer = view.querySelector<HTMLElement>(".screen-actions")!;
  let page = 0;
  return new Promise((resolve, reject) => {
    const render = () => {
      const [title, body] = pages[page];
      walk.innerHTML = `${art(page)}<div class="dots">${pages.map((_, i) => `<span class="${i === page ? "on" : ""}"></span>`).join("")}</div>
        <span class="overline">${page + 1} / ${pages.length}</span><div class="question"><h1>${title}</h1><p class="lead">${body}</p></div>`;
      footer.innerHTML = page < pages.length - 1
        ? button("walk-next", tr("次へ", "Next"), "primary")
        : button("walk-random", tr("安全な乱数で作る", "Use secure random"), "primary") + button("walk-dice", tr("サイコロを振って作る", "Roll dice"), "secondary");
    };
    const go = (to: number) => { if (to >= 0 && to < pages.length) { page = to; render(); } };
    footer.addEventListener("click", (event) => {
      const id = (event.target as HTMLElement).closest("button")?.id;
      if (id === "walk-next") go(page + 1);
      if (id === "walk-random" || id === "walk-dice") { view.remove(); resolve(id === "walk-dice" ? "dice" : "random"); }
    });
    leave = () => { view.remove(); reject(cancelled()); };
    // A sideways swipe turns the page, as on the phones
    let startX = 0;
    walk.addEventListener("pointerdown", (event) => { startX = event.clientX; });
    walk.addEventListener("pointerup", (event) => { if (Math.abs(event.clientX - startX) > 40) go(page + (event.clientX < startX ? 1 : -1)); });
    render();
  });
}

function chooseWords(dice: boolean): Promise<12 | 24> {
  const option = (count: 12 | 24, detail: string) => `<button class="tile tile-wide" id="words-${count}"><span class="tile-copy">
    <span class="tile-title">${tr(`${count}個の単語`, `${count} words`)}</span><span class="tile-detail">${detail}</span></span></button>`;
  let leave = () => {};
  const view = step(tr("新しいウォレット", "New wallet"), `${steps(1)}<div class="question"><h1>${tr("単語の数を選ぶ", "Choose how many words")}</h1>
    <p class="lead">${tr("どちらも安全です。24個のほうが余裕がありますが、書き写す量が倍になります。", "Both are safe. 24 words leave more margin but take twice as long to write down.")}</p></div>
    ${option(12, dice ? tr("サイコロを50回振る", "Roll a die 50 times") : tr("いちばんよく使われる長さ", "The most common length"))}
    ${option(24, dice ? tr("サイコロを99回振る", "Roll a die 99 times") : tr("より長く、より強い", "Longer and stronger"))}`, "", () => leave());
  return new Promise((resolve, reject) => {
    leave = () => { view.remove(); reject(cancelled()); };
    view.addEventListener("click", (event) => {
      const id = (event.target as HTMLElement).closest("button")?.id;
      if (id === "words-12" || id === "words-24") { view.remove(); resolve(id === "words-12" ? 12 : 24); }
    });
  });
}

const face = (n: number) => `<svg viewBox="0 0 30 30" aria-hidden="true">${({ 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] } as Record<number, number[][]>)[n]
  .map(([x, y]) => `<circle cx="${6 + x * 9}" cy="${6 + y * 9}" r="2.6" fill="currentColor"/>`).join("")}</svg>`;

// The rolls as a mark sheet, filled in as they come, with each face's count against an even die's
function markSheet(rolls: number[], need: number) {
  const bands = Math.ceil(need / 50), row = 11, gap = 10, label = 12, bars = 56, column = 5.6, width = label + 50 * column + 8 + bars;
  const counts = [1, 2, 3, 4, 5, 6].map((f) => rolls.filter((r) => r === f).length);
  const scale = (bars - 22) / Math.max(...counts, need / 3);
  let svg = "";
  for (let band = 0; band < bands; band++) {
    const top = band * (6 * row + gap), done = Math.min(Math.max(rolls.length - band * 50, 0), 50);
    if (done) svg += `<rect x="${label}" y="${top}" width="${done * column}" height="${6 * row}" rx="3" fill="var(--primary)"/>`;
    for (let f = 0; f < 6; f++) {
      const y = top + f * row + row / 2;
      svg += `<text x="0" y="${y + 3}" class="mark-label">${f + 1}</text>`;
      for (let i = band * 50; i < Math.min(need, band * 50 + 50); i++) {
        if (i < rolls.length && rolls[i] !== f + 1) continue;
        const hit = i < rolls.length, x = label + (i - band * 50) * column + column / 2;
        svg += `<circle cx="${x}" cy="${y}" r="${hit ? 2.3 : 0.9}" fill="${hit ? (i === rolls.length - 1 ? "var(--accent)" : "var(--on-primary)") : "var(--line-strong)"}"/>`;
      }
    }
  }
  const left = width - bars + 4;
  counts.forEach((count, f) => {
    svg += `<rect x="${left}" y="${f * row + 1.5}" width="${Math.max(count * scale, 1)}" height="${row - 3}" rx="2" fill="var(--icon-well)"/>
      <text x="${left + bars - 19}" y="${f * row + row - 2}" class="mark-label">${count}</text>`;
  });
  svg += `<path d="M${left + need / 6 * scale} 0V${6 * row}" stroke="var(--ink-muted)" stroke-dasharray="2 2"/>`;
  return `<svg class="mark-sheet" viewBox="0 0 ${width} ${bands * 6 * row + (bands - 1) * gap}">${svg}</svg>`;
}

function rollDice(count: 12 | 24): Promise<Uint8Array> {
  const need = count === 12 ? 50 : 99;
  const rolls: number[] = [];
  const key = (n: number) => `<button class="die-key" data-face="${n}" aria-label="${n}">${face(n)}</button>`;
  let leave = () => {};
  const view = step(tr("サイコロ", "Dice"), `${steps(1)}<p class="lead">${tr(`1回振るごとに、出た目を押してください。ちょうど${need}回で単語になります。`, `After each roll, tap the face that came up. Exactly ${need} rolls make the words.`)}</p>
    <div class="roll-well"><div class="roll-head"><span class="roll-history"></span><span class="roll-count"></span></div><div class="roll-sheet"></div></div>
    <div class="die-grid">${key(1)}${key(2)}${key(3)}<button class="die-key die-edit" id="die-undo" aria-label="${tr("1つ消す", "Undo")}">⌫</button>
      ${key(4)}${key(5)}${key(6)}<button class="die-key die-edit" id="die-clear">${tr("全消去", "Clear")}</button></div>`,
    button("die-make", tr("単語を作る", "Make the words"), "primary"), () => leave());
  const history = view.querySelector<HTMLElement>(".roll-history")!;
  const counter = view.querySelector<HTMLElement>(".roll-count")!;
  const marks = view.querySelector<HTMLElement>(".roll-sheet")!;
  const make = view.querySelector<HTMLButtonElement>("#die-make")!;
  const update = () => {
    const last = rolls.slice(-10);
    history.innerHTML = rolls.length ? `${rolls.length > 10 ? "… " : ""}${last.slice(0, -1).join(" ")} <strong>${last[last.length - 1]}</strong>`
      : tr("出た目を下で押してください。", "Tap the face that came up.");
    counter.textContent = `${rolls.length} / ${need}`;
    counter.classList.toggle("full", rolls.length === need);
    marks.innerHTML = markSheet(rolls, need);
    view.querySelectorAll<HTMLButtonElement>(".die-key[data-face]").forEach((key) => { key.disabled = rolls.length >= need; });
    view.querySelector<HTMLButtonElement>("#die-undo")!.disabled = !rolls.length;
    view.querySelector<HTMLButtonElement>("#die-clear")!.disabled = !rolls.length;
    make.disabled = rolls.length !== need;
  };
  update();
  return new Promise((resolve, reject) => {
    leave = () => { rolls.fill(0); view.remove(); reject(cancelled()); };
    view.addEventListener("click", async (event) => {
      const target = (event.target as HTMLElement).closest("button");
      if (!target || target.classList.contains("topbar-back")) return;
      if (target.dataset.face && rolls.length < need) { rolls.push(Number(target.dataset.face)); navigator.vibrate?.(10); }
      if (target.id === "die-undo") rolls.pop();
      if (target.id === "die-clear" && await dialog(tr("入れた目を全部消しますか", "Clear every roll?"), "",
        [["clear-cancel", tr("キャンセル", "Cancel")], ["clear-all", tr("全部消す", "Clear all"), true]]) === "clear-all") rolls.length = 0;
      if (target.id === "die-make") {
        const bytes = new TextEncoder().encode(rolls.join(""));
        const flags = call<{ flags: number }>("dice_check", bytes, count).flags;
        if (!(flags & (DICE_BIASED | DICE_PATTERN)) || await dialog(flags & DICE_BIASED ? tr("出た目に偏りがあります", "The rolls are uneven") : tr("出た目に規則性があります", "The rolls follow a pattern"),
          tr("公平なサイコロなら、ほとんど起きない並びです。目の押し間違いや、偏ったサイコロでないか確かめてください。振り直すことをおすすめします。", "A fair die almost never gives rolls like these. Check for mistyped rolls or a weighted die. Rolling again is recommended."),
          [["dice-anyway", tr("このまま作る", "Use them anyway")], ["dice-again", tr("振り直す", "Roll again"), true]], { fixed: true }) === "dice-anyway") {
          view.remove();
          resolve(bytes);
          return;
        }
        bytes.fill(0);
        rolls.length = 0;
      }
      update();
    });
  });
}

function derivation(phrase: string[], rolls: Uint8Array | null) {
  const entropy = call<{ payload: number[] }>("seedqr_from_mnemonic", new TextEncoder().encode(phrase.join(" ")), 1).payload;
  const list = words(), bits = entropy.length * 8, checksum = phrase.length / 3;
  const cleared = rolls?.every((b) => b === 0);
  const hex = entropy.map((b) => b.toString(16).padStart(2, "0")).join("").match(/.{4}/g)!;
  const table = phrase.map((word, i) => {
    const index = list.indexOf(word), b = index.toString(2).padStart(11, "0");
    const shown = i === phrase.length - 1 ? `${b.slice(0, 11 - checksum)}<strong class="checksum">${b.slice(11 - checksum)}</strong>` : b;
    return `${String(i + 1).padStart(2, " ")}  ${shown}  ${String(index).padStart(4, " ")}  ${escape(word)}`;
  }).join("\n");
  const view = step(tr("単語のでき方", "How it was made"), `${stamp()}<div class="question"><h1>${tr("この単語のでき方", "How these words were made")}</h1>
    <p class="lead">${tr("あなたの単語が、どの値から、どう計算されたかを順に示します。どれも単語と同じく秘密です。", "Step by step, the values your words were computed from. Every one of them is as secret as the words.")}</p></div>
    ${rolls ? `<h2 class="heading">1  ${tr(`サイコロの目(${rolls.length}回)`, `The rolls (${rolls.length})`)}</h2>
      <pre class="well" id="derive-rolls">${cleared ? tr("メモリから消しました。", "Cleared from memory.") : new TextDecoder().decode(rolls).match(/.{1,10}/g)!.join("\n")}</pre>
      ${button("derive-forget", tr("サイコロの目をメモリから消す", "Clear the rolls from memory"), "secondary")}
      <p class="arrow">↓  ${tr(`目を文字として並べて SHA-256 を取り、先頭${bits}ビットを使う。SeedSigner、Krux、bitcoiner.guide/seed と同じ方法です`, `SHA-256 of the rolls as text; the first ${bits} bits are kept. SeedSigner, Krux and bitcoiner.guide/seed do the same`)}</p>`
      : `<h2 class="heading">1  ${tr("安全な乱数", "Secure random")}</h2><p>${tr(`ブラウザの安全な乱数(crypto.getRandomValues)から${bits}ビットを取りました。`, `${bits} bits from the browser's secure random numbers (crypto.getRandomValues).`)}</p>
      <p class="arrow">↓  ${tr("そのまま使う", "Used as they are")}</p>`}
    <h2 class="heading">2  ${tr(`エントロピー(${bits}ビット、16進)`, `The entropy (${bits} bits, in hex)`)}</h2>
    <pre class="well">${hex.map((g, i) => g + ((i + 1) % 4 ? " " : "\n")).join("").trim()}</pre>
    <p class="arrow">↓  ${tr(`SHA-256 の先頭${checksum}ビットをチェックサムとして末尾に足し、11ビットずつ${phrase.length}個に区切る`, `The first ${checksum} bits of its SHA-256 go on the end as a checksum; then ${phrase.length} groups of 11 bits`)}</p>
    <h2 class="heading">3  ${tr("11ビットの番号と単語", "Eleven bits, a number, a word")}</h2>
    <p class="caption">${tr("番号は 2048語の単語表(BIP39)の位置です。色の付いたビットがチェックサムです。", "The number is the place in the 2048-word BIP39 list. The coloured bits are the checksum.")}</p>
    <pre class="well">${table}</pre>`, button("derive-close", tr("閉じる", "Close"), "primary"), () => view.remove());
  entropy.fill(0);
  const forget = view.querySelector<HTMLButtonElement>("#derive-forget");
  if (forget) forget.disabled = !!cleared;
  forget?.addEventListener("click", () => {
    rolls!.fill(0);
    view.querySelector("#derive-rolls")!.textContent = tr("メモリから消しました。", "Cleared from memory.");
    forget.disabled = true;
  });
  view.querySelector("#derive-close")!.addEventListener("click", () => view.remove());
}

type Ended = "wrote" | "seedqr" | "back";

// The write-down step of a new wallet (`made` holds its rolls) and the result of BIP85. The SeedQR, in the
// format the wallet reads, ends the flow as on Android
export function showMnemonic(phrase: string[], heading: string, seedQr: boolean, made?: { rolls: Uint8Array | null }): Promise<Ended> {
  const per = Math.ceil(phrase.length / (phrase.length > 12 ? 3 : 2));
  const column = (from: number) => `<ol>${phrase.slice(from, from + per).map((w, i) => `<li><span>${from + i + 1}</span>${escape(w)}</li>`).join("")}</ol>`;
  let leave = () => {};
  const view = step(heading, `${stamp()}${made ? steps(2) : ""}<div class="question"><h1>${tr(`${phrase.length}個の単語を書き写す`, `Write down your ${phrase.length} words`)}</h1>
    <p class="lead">${tr("紙に、この順番で書いてください。見た人はビットコインを持ち出せます。", "Write them on paper, in this order. Anyone who sees them can take your bitcoin.")}</p></div>
    <div class="card word-grid${phrase.length > 12 ? " three" : ""}">${[0, per, 2 * per].filter((f) => f < phrase.length).map(column).join("")}</div>
    <div class="links">${seedQr ? `<button class="link" id="write-seedqr">${tr("SeedQRを表示", "Show SeedQR")}</button>` : ""}
      ${made ? `<button class="link" id="write-explain">${tr("この単語のでき方", "How they were made")}</button>` : ""}</div>`,
    button("write-done", made ? tr("書き写しました", "I wrote them down") : tr("完了", "Done"), "primary"), () => leave());
  view.querySelector("#write-explain")?.addEventListener("click", () => derivation(phrase, made!.rolls));
  return new Promise((resolve) => {
    const end = (how: Ended) => { view.remove(); resolve(how); };
    leave = () => end("back");
    view.querySelector("#write-done")!.addEventListener("click", () => end("wrote"));
    view.querySelector("#write-seedqr")?.addEventListener("click", async () => {
      view.remove();
      const format = await choose(tr("SeedQRの形式", "SeedQR format"), tr("形式を選んでください", "Choose a format"), tr("読み取るウォレットが対応している形式を選んでください。", "Pick the format your wallet can scan."),
        [[tr("標準のSeedQR", "Standard SeedQR"), tr("多くのウォレットが対応", "Works with most wallets")], ["CompactSeedQR", tr("小さいQR・対応するウォレットのみ", "Smaller QR · supported wallets only")]]);
      if (format < 0) return resolve("back");
      const payload = call<{ payload: number[] }>("seedqr_from_mnemonic", new TextEncoder().encode(phrase.join(" ")), format).payload;
      const frame = String.fromCharCode(...payload);
      payload.fill(0);
      await showFrames([frame], { kind: "secret", heading: format ? "CompactSeedQR" : tr("標準のSeedQR", "Standard SeedQR"), name: "SeedQR",
        description: tr("対応するウォレットで読み取ってください。このQRは人に見せないでください。", "Scan this QR with a compatible wallet and keep it private.") });
      resolve("seedqr");
    });
  });
}

// Five random positions against three decoys each, as coconut_vault asks before a seed is kept
function quiz(phrase: string[]): Promise<"passed" | "again" | "back"> {
  const list = words();
  const positions = [...phrase.keys()].sort(() => Math.random() - .5).slice(0, 5);
  let leave = () => {};
  const view = step(tr("バックアップの確認", "Check your backup"), `${stamp()}<div class="quiz"></div>`, "", () => leave());
  const body = view.querySelector<HTMLElement>(".quiz")!;
  let round = 0;
  return new Promise((resolve) => {
    const end = (how: "passed" | "again" | "back") => { view.remove(); resolve(how); };
    leave = () => end("back");
    const ask = () => {
      if (round === positions.length) return end("passed");
      const answer = phrase[positions[round]];
      const options = [...list.filter((w) => w !== answer).sort(() => Math.random() - .5).slice(0, 3), answer].sort(() => Math.random() - .5);
      body.innerHTML = `<span class="overline">${tr(`確認 ${round + 1} / ${positions.length}`, `CHECK ${round + 1} OF ${positions.length}`)}</span>
        <div class="question"><h1>${tr(`${positions[round] + 1}番目の単語はどれですか`, `Which is word ${positions[round] + 1}?`)}</h1>
        <p class="lead">${tr("紙に書いた単語を見て選んでください。", "Look at your paper and choose it.")}</p></div>
        <div class="quiz-options">${options.map((o) => `<button class="button button-secondary" data-word="${escape(o)}"><span>${escape(o)}</span></button>`).join("")}</div>`;
    };
    view.addEventListener("click", async (event) => {
      const target = (event.target as HTMLElement).closest("button");
      if (!target?.dataset.word) return;
      if (target.dataset.word === phrase[positions[round]]) { round++; ask(); return; }
      const choice = await dialog(tr(`${positions[round] + 1}番目の単語ではありません`, `That is not word ${positions[round] + 1}`),
        tr("紙に書いた単語と見比べて、もう一度試してください。", "Compare your backup with the words and try again."),
        [["quiz-again", tr("選び直す", "Choose again")], ["quiz-words", tr("単語をもう一度見る", "Show the words"), true]]);
      if (choice === "quiz-words") end("again");
    });
    ask();
  });
}

export async function createWallet() {
  const how = await walkthrough();
  const count = await chooseWords(how === "dice");
  let rolls: Uint8Array | null = null;
  let made: string;
  if (how === "dice") {
    rolls = await rollDice(count);
    made = call<{ mnemonic: string }>("mnemonic_from_dice", rolls.slice(), count).mnemonic;
  } else {
    const entropy = crypto.getRandomValues(new Uint8Array(count / 3 * 4));
    made = call<{ mnemonic: string }>("mnemonic_from_entropy", entropy).mnemonic;
    entropy.fill(0);
  }
  const phrase = made.split(" ");
  try {
    for (;;) {
      const shown = await showMnemonic(phrase, tr("新しいウォレット", "New wallet"), true, { rolls });
      if (shown === "seedqr") return;
      const checked = shown === "wrote" ? await quiz(phrase) : "back";
      if (checked === "back") throw cancelled();
      if (checked === "passed") break;
    }
    const load = await dialog(tr("バックアップを確かめました", "Backup checked"), tr("このシードフレーズを、署名に使う鍵として今読み込みますか。", "Load these words as the signing key now?"),
      [["backup-done", tr("完了", "Done")], ["backup-load", tr("読み込む", "Load it"), true]]);
    if (load === "backup-load") await loadWords(new TextEncoder().encode(phrase.join(" ")));
  } finally {
    rolls?.fill(0);
    phrase.fill("");
  }
}
