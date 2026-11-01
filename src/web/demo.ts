import qrcode from "qrcode-generator";
import { icon } from "../design/icons";
import { webApp, webDemo } from "../signer";
import type { SignerState } from "../signer";
import { tr } from "../views";
import { bip85, exportMultisig, registerMultisig, signMessage } from "./advanced";
import { createWallet, step } from "./create";
import { canStore, disableStorage, enableStorage, hex, passkeySecret, savedKeys, setSavedKeys, storageOn, unhex } from "./keystore";
import type { Saved } from "./keystore";
import { call, startEngine } from "./engine";

// Published BIP39 test words, their first testnet receive address, and a testnet PSBT that spends from them (samples/psbt-ur-test-only.png)
const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const testAddress = "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl";
const testPsbt = "UR:CRYPTO-PSBT/HDYLJOJKIDJYZMADAEGMAOAEAEAEADFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWAEAEAEAEAEZMZMZMZMADROLFADAEAEAEAEAECMAEBBFMEEMKHLSGJLUTSOZOENNLFZVESTTPVOLTFHGMNSAEAEAEAEAEADADCTNBLNADAEAEAEAEAECMAEBBRTTORFTBSRTESGLKKPUOHYSWDMRNGOEOBAYTBEVOCPAMAXDYTLGWTIUTFWBKJTHELGENDKYKWFFDDWPLECBSKKTLWTKPFRYKRNWSNSDPMEPEFNCSJKSKTNBKGHAEAELAAEAEAELAAEAEAELAAEAEAEAEAEAEAEAEAECPAOAXAOGUDKLOMNFWNYROVLUYPECTKSAOIELUNSTICKNDFPLRLPSKZSGSCWNDHGAEVYOLCSJKSKTNBKGHAEAELAAEAEAELAAEAEAELAADAEAEAEAEAEAEAEAEUYASYLBN";

type Output = { amount: number; owner: string; kind: string; text: string };
type Review = { spend: number; fee: number; totalIn: number; signatures: number; outputs: Output[] };

const ready = startEngine().then(() => { if (webDemo) call("set_network", 1); });
// The installed app cannot turn networks off, so it treats any network as a required restriction and wipes the key
function state() {
  const online = webApp && navigator.onLine;
  if (online) call("lock");
  const engine = call<SignerState>("state");
  return { ...engine, testnet: webDemo || engine.testnet, storage: webApp && storageOn(), deviceSecure: webApp && canStore(),
    saved: webApp ? savedKeys().length : 0,
    restrictions: webApp ? [{ id: "network", level: "require" as const, active: online, detail: "" }] : [] };
}
// As on the phones, leaving the app wipes the key
if (webApp) document.addEventListener("visibilitychange", () => { if (document.hidden) void ready.then(() => call("lock")); });
const btc = (sats: number) => `${Math.floor(sats / 1e8)}.${String(sats % 1e8).padStart(8, "0")}`;
export const button = (id: string, label: string, variant: string) => `<button class="button button-${variant}" id="${id}"><span>${label}</span></button>`;
export const escape = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const layer = () => document.querySelector(".phone") ?? document.body;

// A full-screen step over the app, laid out like the native ones. With `onBack`, the top bar's Back cancels it
export function sheet(title: string, body: string, actions: string, onBack?: () => void) {
  const network = call<SignerState>("state").testnet ? tr("テストネット", "Testnet") : tr("メインネット", "Mainnet");
  const element = document.createElement("div");
  element.className = "sheet";
  element.innerHTML = `<div class="app-shell">
    <header class="topbar">${onBack ? `<button class="topbar-back" aria-label="${tr("戻る", "Back")}">${icon("back")}</button>` : ""}<span class="topbar-title">${escape(title)}</span>
      <span class="topbar-status"><span class="pill pill-neutral">${icon("check", 16)}<span>${network}</span></span></span></header>
    <main class="screen-body">${body}</main>
    ${actions ? `<footer class="screen-actions">${actions}</footer>` : ""}
  </div>`;
  if (onBack) element.querySelector(".topbar-back")!.addEventListener("click", onBack);
  layer().append(element);
  return element;
}

type Choice = [id: string, label: string, primary?: boolean];

// The phones' alert dialog: a title, a message or a form, and text buttons at the end. Tapping outside
// picks null unless it is `fixed`; `check` can keep it open, as a form does until it is filled in
export function dialog(title: string, message: string, choices: Choice[],
  opts: { body?: string; fixed?: boolean; check?: (id: string, box: HTMLElement) => boolean } = {}): Promise<string | null> {
  const scrim = document.createElement("div");
  scrim.className = "dialog-scrim";
  scrim.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true"><h2 class="heading">${escape(title)}</h2>
    ${message ? `<p class="dialog-message">${escape(message)}</p>` : ""}${opts.body ?? ""}
    <div class="dialog-actions">${choices.map(([id, label, primary]) => `<button class="dialog-button${primary ? " primary" : ""}" id="${id}">${label}</button>`).join("")}</div></div>`;
  layer().append(scrim);
  return new Promise((resolve) => {
    const close = (id: string | null) => { scrim.remove(); resolve(id); };
    scrim.addEventListener("click", (event) => {
      if (event.target === scrim) { if (!opts.fixed) close(null); return; }
      const id = (event.target as HTMLElement).closest(".dialog-button")?.id;
      if (id && (opts.check?.(id, scrim) ?? true)) close(id);
    });
  });
}

// A full-screen list to pick from, as on Android; Back gives -1
export function choose(heading: string, title: string, lead: string, options: [string, string][]): Promise<number> {
  let back = () => {};
  const view = step(heading, `<div class="question"><h1>${title}</h1><p class="lead">${lead}</p></div>
    <div class="card">${options.map(([name, detail], i) => `<button class="row" data-choice="${i}"><span class="row-copy"><span class="row-title">${escape(name)}</span>
      <span class="row-detail">${escape(detail)}</span></span>${icon("chevron", 20)}</button>`).join("")}</div>`, "", () => back());
  return new Promise((resolve) => {
    back = () => { view.remove(); resolve(-1); };
    view.addEventListener("click", (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>("[data-choice]");
      if (row) { view.remove(); resolve(Number(row.dataset.choice)); }
    });
  });
}

// Hands each frame of the back camera to `onFrame` as greyscale until the returned function stops it.
// Frames are scaled down to the reader's limit of 1280x720 pixels and 1280 a side
function startCamera(view: HTMLElement, status: HTMLElement, onFrame: (grey: Uint8Array, w: number, h: number) => void) {
  const video = view.querySelector("video")!;
  const canvas = document.createElement("canvas");
  let stream: MediaStream | null = null;
  let stopped = false;
  const tick = () => {
    if (!stream) return;
    if (video.readyState >= 2) {
      const { videoWidth: vw, videoHeight: vh } = video;
      const scale = Math.min(1, 1280 / vw, 1280 / vh, Math.sqrt((1280 * 720) / (vw * vh)));
      const [w, h] = [Math.floor(vw * scale), Math.floor(vh * scale)];
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(video, 0, 0, w, h);
      const image = context.getImageData(0, 0, w, h);
      const grey = new Uint8Array(w * h);
      for (let i = 0; i < grey.length; i++) grey[i] = (image.data[4 * i] * 77 + image.data[4 * i + 1] * 150 + image.data[4 * i + 2] * 29) >> 8;
      // The frame may show a seed, so no copy of it is left behind in the page
      image.data.fill(0);
      context.clearRect(0, 0, w, h);
      onFrame(grey, w, h);
      grey.fill(0);
    }
    requestAnimationFrame(tick);
  };
  navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } }).then((media) => {
    if (stopped) return media.getTracks().forEach((track) => track.stop());
    stream = media;
    video.srcObject = media;
    void video.play();
    tick();
  }).catch(() => { status.textContent = tr("カメラを使えません。", "The camera is not available."); });
  return () => {
    stopped = true;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };
}

type Frame = { found: boolean; code: number; text?: string };
type ScanMode = "seed" | "psbt" | "multisig" | "address";
// What each scan reads, as QrScanActivity says it, and the engine's reader for it: 1 SeedQR, 2 animated UR, 0 any
const scanModes: Record<ScanMode, [string, string, string, number]> = {
  seed: [tr("バックアップのQRを読み取る", "Scan your backup QR"), tr("SeedQR・CompactSeedQR", "SeedQR or CompactSeedQR"),
    tr("鍵はこのスマホの中でだけ用意します。読み取った内容は表示しません。", "The key is prepared on this phone only. What is scanned is never shown."), 1],
  psbt: [tr("取引のQRを読み取る", "Scan the transaction QR"), "UR crypto-psbt",
    tr("ウォレットアプリのアニメーションQRをカメラに向けてください。読み取りは自動で進みます。", "Point the camera at your wallet app's animated QR. Scanning continues as frames arrive."), 2],
  multisig: [tr("マルチシグの設定を読み取る", "Scan a multisig setup"), tr("BSMS・ディスクリプター", "BSMS or descriptor"),
    tr("ディスクリプター、BSMS、Coldcardの書き出し、またはアニメーションQR(ur:crypto-output・ur:bytes)を読み取ります。", "Show a descriptor, BSMS or Coldcard export, or an animated ur:crypto-output or legacy ur:bytes QR."), 0],
  address: [tr("アドレスのQRを読み取る", "Scan an address QR"), tr("アドレス・bitcoin: URI", "Address or bitcoin: URI"),
    tr("ウォレットアプリの受け取り画面に出るQRを読み取ります。", "Show the QR from your wallet app's receive screen."), 0],
};
export const receiving = (progress: unknown) => tr(`受信中・${progress}`, `Receiving frames · ${progress}`);
type Reading<T> = { done: T } | string;

// The camera screen. `accept` gets each new reading and returns the result or a status line; what it
// throws ends the scan. The demo's test reading stands in for a camera
export function scan<T>(mode: ScanMode, accept: (text: string) => Reading<T>, test?: [id: string, label: string, text: string]): Promise<T> {
  const [title, term, help, kind] = scanModes[mode];
  const cancelled = tr("QRの読み取りをやめました。", "QR scan was cancelled");
  let cancel = () => {};
  const view = sheet(tr("読み取り", "Scan"), `<div class="scan-head"><h1>${title}</h1><p class="caption">${term}</p></div>
    <div class="scan-stage"><video playsinline muted></video><span class="scan-frame"></span></div>`,
    `<p class="scan-status" id="scan-status">${mode === "psbt" || mode === "multisig" ? tr("QRを待っています", "Waiting for the QR") : tr("QRを枠の中に合わせてください", "Fit the QR inside the frame")}</p>
    <p class="caption">${help}</p>
    ${test ? `<p class="caption">${tr("カメラがないときは、テスト用の取引で試せます。", "Without a camera, try the test transaction.")}</p>${button(test[0], test[1], "secondary")}` : ""}
    ${button("scan-cancel", tr("キャンセル", "Cancel"), "secondary")}`, () => cancel());
  view.querySelector(".screen-body")!.className = "screen-body scan-body";
  const status = view.querySelector<HTMLElement>("#scan-status")!;
  return new Promise((resolve, reject) => {
    let stop = () => {};
    const finish = (result: { done: T } | { error: unknown }) => {
      stop();
      view.remove();
      if ("done" in result) resolve(result.done); else reject(result.error);
    };
    cancel = () => finish({ error: cancelled });
    const take = (text: string) => {
      try {
        const reading = accept(text);
        if (typeof reading === "string") status.textContent = reading; else finish(reading);
      } catch (error) {
        finish({ error });
      }
    };
    let last = "";
    stop = startCamera(view, status, (grey, w, h) => {
      const frame = call<Frame>("qr_frame", grey, w, h, kind);
      if (frame.found && (kind === 1 || frame.text !== last)) {
        last = frame.text ?? "";
        take(last);
      } else if (frame.code === -3) {
        status.textContent = mode === "seed" ? tr("SeedQRではありません", "This is not a SeedQR") : tr("取引のQRではありません", "This is not a transaction QR");
      }
    });
    if (test) view.querySelector(`#${test[0]}`)!.addEventListener("click", () => take(test[2]));
    view.querySelector("#scan-cancel")!.addEventListener("click", cancel);
  });
}

function scanPsbt(): Promise<Review> {
  call("reset_ur");
  return scan<Review>("psbt", (text) => {
    try {
      const result = call<{ complete: boolean; progress: number | string; review?: Review }>("receive_ur", text.toLowerCase());
      return result.complete ? { done: result.review! } : receiving(result.progress);
    } catch (error) {
      call("reset_ur");
      return String(error);
    }
  }, webDemo ? ["scan-test", tr("テスト用の取引を使う", "Use the test transaction"), testPsbt] : undefined);
}

// The engine reads the SeedQR from the camera's frames and keeps it: the page learns only that one was found
const scanSeed = () => scan<void>("seed", () => ({ done: undefined }));

// The native apps' entry: an A-Z keypad that only offers letters continuing a BIP39 word, so the words
// never pass through the system keyboard. Words are kept as indices and joined into bytes the caller wipes
function askWords(): Promise<Uint8Array> {
  const list = call<{ words: string[] }>("wordlist").words;
  const slots = new Int16Array(24).fill(-1);
  let size = 12, cur = 0, typed = "", lastPool: number[] | null = null;
  const packed = (indices: ArrayLike<number>) => Uint8Array.from(Array.from(indices).flatMap((v) => [v & 0xff, v >> 8]));
  const letters = (text: string) => new TextEncoder().encode(text);
  const filter = () => (lastPool ? packed(lastPool) : new Uint8Array());
  const matches = (prefix: string) => call<{ matches: number[] }>("word_matches", letters(prefix), filter()).matches;
  const finalWords = () => call<{ words: number[] }>("final_words", packed(slots.subarray(0, size - 1))).words;
  const view = step(tr("シードフレーズ", "Recovery words"), `<span class="overline">${tr("単語の数", "NUMBER OF WORDS")}</span>
    <div class="segments segments-5" id="lengths">${[12, 15, 18, 21, 24].map((n) => `<button class="segment" data-size="${n}">${n}</button>`).join("")}</div>
    <div class="word-slots" id="slots"></div>
    <div class="word-entry"><span id="entry"></span><span class="caption" id="hint"></span></div>
    <div class="word-candidates" id="candidates"></div>
    <div class="word-keys">${["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row, r) => `<div>${[...row].map((c) => `<button class="word-key" data-key="${c}">${c}</button>`).join("")}${r === 2 ? `<button class="word-key" id="back" aria-label="${tr("1文字消す", "Delete")}">⌫</button>` : ""}</div>`).join("")}</div>
    <p class="caption" id="status"></p>`,
    button("words-continue", tr("続ける", "Continue"), "primary"), () => cancel());
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => view.querySelector<T>(`#${id}`)!;
  const nextEmpty = (from: number) => {
    for (let i = from; i < size; i++) if (slots[i] < 0) return i;
    for (let i = 0; i < size; i++) if (slots[i] < 0) return i;
    return size;
  };
  const complete = () => Array.from(slots.subarray(0, size - 1)).every((v) => v >= 0);
  const refresh = () => {
    lastPool = cur === size - 1 && complete() ? finalWords() : null;
    render();
  };
  const commit = (index: number) => { slots[cur] = index; typed = ""; cur = nextEmpty(cur + 1); refresh(); };
  const render = () => {
    const done = cur >= size;
    view.querySelectorAll<HTMLElement>("#lengths .segment").forEach((b) => b.classList.toggle("selected", Number(b.dataset.size) === size));
    // Down each column, as on the write-down screen: 24 words are three columns of eight
    const columns = size > 12 ? 3 : 2, per = Math.ceil(size / columns);
    const slotsEl = $("slots");
    slotsEl.className = `word-slots${columns === 3 ? " three" : ""}`;
    slotsEl.innerHTML = Array.from({ length: per * columns }, (_, n) => (n % columns) * per + Math.floor(n / columns)).map((i) => i >= size ? "<span></span>"
      : `<button class="word-slot${i === cur ? " current" : ""}" data-slot="${i}"><span>${i + 1}</span>${i === cur ? escape(typed) : slots[i] >= 0 ? list[slots[i]] : ""}</button>`).join("");
    const hits = done ? [] : typed ? matches(typed) : lastPool ?? [];
    $("entry").textContent = done ? "" : tr(`${cur + 1}番目の単語`, `Word ${cur + 1}`);
    $("hint").textContent = done ? "" : lastPool ? tr(`チェックサムが合う${hits.length}件`, `${hits.length} with a valid checksum`) : typed ? tr(`${hits.length}件の候補`, `${hits.length} matches`) : "";
    $("candidates").innerHTML = hits.slice(0, 24).map((i) => `<button class="word-candidate" data-word="${i}">${list[i]}</button>`).join("");
    const allowed = done ? 0 : call<{ letters: number }>("word_letters", letters(typed), filter()).letters;
    view.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((b) => { b.disabled = !((allowed >> (b.dataset.key!.charCodeAt(0) - 97)) & 1); });
    const valid = done && finalWords().includes(slots[size - 1]);
    const status = $("status");
    status.textContent = valid ? tr(`${size}個の単語・チェックサムOK`, `${size} words · checksum OK`)
      : done ? tr("チェックサムが一致しません。単語をタップして直してください。", "The checksum does not match. Tap a word to fix it.")
      : tr("単語をタップすると打ち直せます。紙のバックアップと同じ順番で入力してください。", "Tap a word to retype it. Enter them in the order on your paper backup.");
    status.className = `caption${valid ? " positive" : done ? " problem" : ""}`;
    $<HTMLButtonElement>("words-continue").disabled = !valid;
  };
  view.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("button");
    if (!target) return;
    const { size: length, slot, word, key } = target.dataset;
    if (length) {
      size = Number(length);
      slots.fill(-1, size);
      typed = "";
      cur = nextEmpty(0);
      refresh();
    } else if (slot) {
      slots[Number(slot)] = -1;
      typed = "";
      cur = Number(slot);
      refresh();
    } else if (word) commit(Number(word));
    else if (key) {
      typed += key;
      const hits = matches(typed);
      if (hits.length === 1) commit(hits[0]);
      else render();
    } else if (target.id === "back") {
      if (typed) { typed = typed.slice(0, -1); render(); return; }
      const previous = Math.min(cur, size) - 1;
      if (previous < 0) return;
      slots[previous] = -1;
      cur = previous;
      refresh();
    }
  });
  let cancel = () => {};
  return new Promise((resolve, reject) => {
    const close = () => { slots.fill(-1); typed = ""; lastPool = null; call("word_entry_end"); view.remove(); };
    cancel = () => { close(); reject(tr("鍵の読み込みをやめました。", "Seed import was cancelled")); };
    $("words-continue").addEventListener("click", () => {
      const parts = Array.from(slots.subarray(0, size), (i) => letters(list[i]));
      const words = new Uint8Array(parts.reduce((n, w) => n + w.length + 1, -1)).fill(32);
      parts.reduce((at, w) => { words.set(w, at); return at + w.length + 1; }, 0);
      close();
      resolve(words);
    });
    render();
  });
}

function outputCard(output: Output, index: number, count: number) {
  const external = output.owner === "Send to";
  const label = external ? tr("送り先", "Send to") : output.owner === "Change" ? tr("おつり", "Change") : tr("このウォレットのアドレス", "This wallet");
  const note = output.owner === "Change" ? tr("おつり。このウォレットに戻ります。", "Your change, back to this wallet.")
    : !external ? tr("このウォレットのアドレスに送ります。", "Sent to an address of this wallet.")
    : output.kind === "OP_RETURN" ? tr("OP_RETURNのデータ(16進)", "OP_RETURN data (hex)")
    : output.kind !== "Address" ? tr("スクリプト(16進)", "Script (hex)") : "";
  const text = output.kind === "Address" ? output.text.match(/.{1,4}/g)!.join(" ") : output.text || tr("(なし)", "(none)");
  return `<div class="card"><div class="field">
      <span class="field-label">${label} ${index + 1}/${count}</span>
      <span class="data">${escape(text)}</span>
      <span class="${external ? "amount" : "data-plain"}">${btc(output.amount)} BTC</span>
      ${output.kind === "OP_RETURN" && output.amount > 0 ? `<span class="problem">${tr("この金額は失われます。OP_RETURNの出力は使えません。", "This amount is burned: an OP_RETURN output can never be spent.")}</span>` : ""}
      ${note ? `<span class="field-note">${note}</span>` : ""}
    </div>
    <label class="check"><input type="checkbox">${output.kind === "Address" ? tr("このアドレスを確かめました", "I checked this address") : tr("この出力を確かめました", "I checked this output")}</label>
  </div>`;
}

// Every output checked and the end reached before signing, then asked once more, as on the phones
function reviewPsbt(review: Review): Promise<void> {
  let back = () => {};
  const view = sheet(tr("署名の確認", "Review"), `<div class="question"><h1>${tr("この取引に署名しますか", "Sign this transaction?")}</h1></div>
    <div class="card">
      <div class="field"><span class="field-label">${tr("送る金額", "Amount sent")}</span><span class="amount">${btc(review.spend)} BTC</span></div>
      <div class="field"><span class="field-label">${tr("ネットワーク手数料", "Network fee")}</span><span class="data-plain">${btc(review.fee)} BTC</span>
        <span class="field-note">${tr("受取人ではなく、マイナーに支払われます。", "Paid to miners, not to the recipient.")}</span></div>
      <div class="field"><span class="field-label">${tr("署名する入力", "Inputs to sign")}</span><span class="data-plain">${tr(`${review.signatures}件`, `${review.signatures}`)}</span>
        <span class="field-note">${tr(`入力の合計 ${btc(review.totalIn)} BTC`, `Total input ${btc(review.totalIn)} BTC`)}</span></div>
    </div>
    <section class="group"><h2 class="overline">${tr(`送り先とおつり・${review.outputs.length}件`, `SEND TO AND CHANGE · ${review.outputs.length}`)}</h2>
      ${review.outputs.map((output, index) => outputCard(output, index, review.outputs.length)).join("")}</section>
    <p>${tr("署名すると、この内容で送金できるようになります。", "Once signed, this payment can be sent as shown.")}</p>
    <p class="caption">${tr("すべての項目を確かめ、最後までスクロールすると署名できます。", "Check every item and scroll to the end to sign.")}</p>`,
    button("review-cancel", tr("キャンセル", "Cancel"), "secondary") + button("review-sign", tr("署名する", "Sign transaction"), "primary"), () => back());
  const body = view.querySelector<HTMLElement>(".screen-body")!;
  const sign = view.querySelector<HTMLButtonElement>("#review-sign")!;
  let reachedEnd = false;
  const update = () => {
    reachedEnd ||= body.scrollTop + body.clientHeight >= body.scrollHeight - 8;
    sign.disabled = !reachedEnd || [...view.querySelectorAll<HTMLInputElement>(".check input")].some((box) => !box.checked);
  };
  body.addEventListener("scroll", update);
  view.addEventListener("change", update);
  update();
  return new Promise((resolve, reject) => {
    const cancel = () => { call("cancel_review"); reject(tr("署名をやめました。", "Signing was cancelled")); };
    back = () => { view.remove(); cancel(); };
    view.querySelector("#review-cancel")!.addEventListener("click", back);
    sign.addEventListener("click", async () => {
      view.remove();
      const choice = await dialog(tr("署名してよいですか", "Sign it now?"), tr("署名した取引は、ウォレットアプリで読み取るQRとして表示します。", "The signed transaction is shown as QR codes for your wallet app to scan."),
        [["confirm-cancel", tr("キャンセル", "Cancel")], ["confirm-sign", tr("署名する", "Sign"), true]]);
      if (choice === "confirm-sign") resolve(); else cancel();
    });
  });
}

function qrSvg(frame: string) {
  const code = qrcode(0, "L");
  // URs are case-insensitive, and upper case fits the denser alphanumeric mode; a Standard SeedQR is digits
  if (/^ur:/i.test(frame)) code.addData(frame.toUpperCase(), "Alphanumeric");
  else if (/^\d+$/.test(frame)) code.addData(frame, "Numeric");
  else code.addData(frame);
  code.make();
  return code.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
}

// The white of the QR at each brightness step, from SignedQrActivity
const qrWhites = ["#ffffff", "#bebebe", "#828282", "#505050"];
type QrScreen = { kind: "signed" | "account" | "secret"; heading?: string; description?: string; name?: string; interval?: number };

// SignedQrActivity: the QR filling the screen, how far the animation has got, and a dimmer for
// cameras that glare. Frames are text; a CompactSeedQR's bytes come as one character each
export function showFrames(frames: string[], { kind, heading, description, name, interval = 350 }: QrScreen): Promise<void> {
  const title = heading ?? tr("ウォレットアプリで読み取ってください", "Scan this with your wallet app");
  const note = kind === "secret" ? tr("このQRは人に見せないでください。読み取った人は、この鍵を使えます。", "Keep this QR private. Anyone who scans it can access the seed.")
    : kind === "account" ? tr("秘密鍵は含まれていません。", "No private keys are included.")
    : tr("読み取れないときは、QRの明るさを下げてください。", "Lower the brightness if the QR will not scan.");
  const view = sheet(kind === "signed" ? tr("署名済み", "Signed") : title, `<div class="question"><h1>${escape(title)}</h1>
      <p class="lead">${description ?? tr("読み取りが終わったら、ウォレットアプリから送金してください。", "When it has scanned, send the payment from your wallet app.")}</p></div>
    <div class="qr-card"></div>
    <div class="qr-progress">${frames.slice(0, 6).map(() => "<span></span>").join("")}</div>
    <p class="caption qr-count" id="qr-count"></p>
    <div class="qr-brightness"><span class="caption">${tr("QRの明るさ", "QR brightness")}</span>
      <button class="button" id="qr-dimmer" aria-label="${tr("暗くする", "Darker")}">−</button><span class="data-plain" id="qr-level"></span>
      <button class="button" id="qr-brighter" aria-label="${tr("明るくする", "Brighter")}">+</button></div>
    <p class="caption${kind === "secret" ? " problem" : ""}">${note}</p>`, button("qr-done", tr("完了", "Done"), "primary"));
  view.querySelector(".screen-body")!.classList.add("qr-body");
  const card = view.querySelector<HTMLElement>(".qr-card")!;
  const count = view.querySelector<HTMLElement>("#qr-count")!;
  const bars = [...view.querySelectorAll<HTMLElement>(".qr-progress span")];
  const images = frames.map(qrSvg);
  let current = 0, level = 0;
  const show = () => {
    card.innerHTML = images[current];
    card.style.setProperty("--qr-white", qrWhites[level]);
    const label = name ?? (kind === "account" ? ["xpub", "descriptor"][current] ?? "account" : "UR crypto-psbt");
    count.textContent = tr(`${label}・${current + 1} / ${frames.length}・自動で切り替え`, `${label} · ${current + 1} / ${frames.length} · auto`);
    const segment = Math.min(Math.floor(current * bars.length / frames.length), bars.length - 1);
    bars.forEach((bar, i) => bar.classList.toggle("on", i <= segment));
    view.querySelector("#qr-level")!.textContent = `${4 - level}/4`;
  };
  const advance = () => { show(); current = (current + 1) % frames.length; };
  const adjust = (delta: number) => { level = Math.min(Math.max(level + delta, 0), qrWhites.length - 1); current = (current + frames.length - 1) % frames.length; advance(); };
  view.querySelector("#qr-dimmer")!.addEventListener("click", () => adjust(1));
  view.querySelector("#qr-brighter")!.addEventListener("click", () => adjust(-1));
  advance();
  const timer = setInterval(advance, interval);
  return new Promise((resolve) => view.querySelector("#qr-done")!.addEventListener("click", () => { clearInterval(timer); images.fill(""); view.remove(); resolve(); }));
}

// As on Android: everything in one UR, or one kind's xpub and descriptor for wallets that read only that
function chooseAccount(): Promise<number | null> {
  const t = call<SignerState>("state").testnet;
  const kinds: [number | null, string, string][] = [
    [null, "", tr("まとめて書き出す・おすすめ", "All at once · recommended")],
    [84, t ? "tb1q…" : "bc1q…", tr("標準・いちばん一般的", "Standard · most common")],
    [86, t ? "tb1p…" : "bc1p…", tr("Taproot・新しい形式", "Taproot · newest")],
    [49, t ? "2…" : "3…", tr("古いウォレット向け", "For older wallets")],
    [48, t ? "tb1q…" : "bc1q…", tr("マルチシグ用・複数の鍵で管理", "Multisig · several keys")],
  ];
  const card = ([purpose, prefix, name]: (typeof kinds)[number], i: number) => {
    const prefixes = purpose === null ? kinds.slice(1).map((k) => k[1]) : [prefix];
    return `${i === 1 ? `<span class="overline account-single">${tr("1種類だけ書き出す", "ONLY ONE KIND")}</span>` : ""}
      <button class="account-kind" data-kind="${i}"><span class="account-prefix${prefixes.length > 1 ? " many" : ""}">${prefixes.map((x) => `<span>${x}</span>`).join("")}</span>
      <span class="row-copy"><span class="row-title">${name}</span><span class="row-detail">${purpose === null ? "BIP84・86・49・48" : `BIP${purpose}`}</span></span><span class="account-mark"></span></button>`;
  };
  const view = step(tr("ウォレットアプリに登録する", "Register in your wallet app"), `<div class="question"><h1>${tr("書き出す公開鍵を選ぶ", "Choose the keys to share")}</h1>
      <p class="lead">${tr("左の文字は、受け取りアドレスの始まり方です。公開鍵だけを渡し、秘密鍵は含まれていません。", "On the left is how each kind of receive address starts. Only public keys are shared, never private keys.")}</p></div>
    <div class="account-kinds">${kinds.map(card).join("")}</div>
    <p id="account-summary"></p>`,
    button("account-show", tr("QRを表示", "Show QR"), "primary"), () => cancel());
  let chosen = 0;
  const refresh = () => {
    view.querySelectorAll<HTMLElement>("[data-kind]").forEach((b) => b.classList.toggle("selected", Number(b.dataset.kind) === chosen));
    const purpose = kinds[chosen][0];
    view.querySelector("#account-summary")!.textContent = purpose === null
      ? tr("4種類を1つのアニメーションQR(UR crypto-account)で書き出します。Sparrow、Nunchuk、Keystoneなどで読めます。", "All four go in one animated QR (UR crypto-account) for Sparrow, Nunchuk, Keystone and similar wallets.")
      : tr(`BIP${purpose}のxpubとディスクリプターを書き出します。xpubだけを読むアプリにも使えます。`, `Shares the BIP${purpose} xpub and descriptor, which wallets that only read an xpub accept too.`);
  };
  view.querySelectorAll<HTMLElement>("[data-kind]").forEach((b) => b.addEventListener("click", () => { chosen = Number(b.dataset.kind); refresh(); }));
  refresh();
  let cancel = () => {};
  return new Promise((resolve, reject) => {
    cancel = () => { view.remove(); reject(tr("ウォレットアプリへの登録をやめました。", "Wallet app registration was cancelled")); };
    view.querySelector("#account-show")!.addEventListener("click", () => { view.remove(); resolve(kinds[chosen][0]); });
  });
}

// The SeedQR format chooser, then the secret QR; false when Back leaves the chooser
export async function showSeedQr(payload: (compact: number) => number[]) {
  const format = await choose(tr("SeedQRの形式", "SeedQR format"), tr("形式を選んでください", "Choose a format"), tr("読み取るウォレットが対応している形式を選んでください。", "Pick the format your wallet can scan."),
    [[tr("標準のSeedQR", "Standard SeedQR"), tr("多くのウォレットが対応", "Works with most wallets")], ["CompactSeedQR", tr("小さいQR・対応するウォレットのみ", "Smaller QR · supported wallets only")]]);
  if (format < 0) return false;
  const bytes = payload(format);
  const frame = String.fromCharCode(...bytes);
  bytes.fill(0);
  await showFrames([frame], { kind: "secret", heading: format ? "CompactSeedQR" : tr("標準のSeedQR", "Standard SeedQR"), name: "SeedQR",
    description: tr("対応するウォレットで読み取ってください。このQRは人に見せないでください。", "Scan this QR with a compatible wallet and keep it private.") });
  return true;
}

// The pending seed's last screen: the fingerprint with no passphrase and with the typed one, as on the
// phones, and its SeedQR while the words are still here
function askPassphrase(title = tr("パスフレーズ", "Passphrase")): Promise<string> {
  const none = tr("入力すると表示します", "Shown as you type");
  const fingerprint = (passphrase: string) => {
    const bytes = new TextEncoder().encode(passphrase);
    const { fingerprint } = call<{ fingerprint: string }>("seed_preview", bytes);
    bytes.fill(0);
    return fingerprint.replace(/^(.{4})/, "$1 ");
  };
  const words = call<{ words: number }>("seed_length").words;
  const seedQr = words === 12 || words === 24;
  const view = step(title, `<p class="lead">${tr("単語にパスフレーズを付けると、別の鍵になります。付けていない場合は、空のままにしてください。", "A passphrase added to the words makes a different key. If this seed has none, leave it blank.")}</p>
    <input class="input" id="passphrase" type="password" autocomplete="off" spellcheck="false" placeholder="${tr("パスフレーズ", "Passphrase")}">
    ${webDemo ? `<p class="caption">${tr("テスト用の単語では、TREZOR と入れると b4e3 f5ed になります。", "With the test words, TREZOR gives b4e3 f5ed.")}</p>` : ""}
    <h2 class="overline">${tr("フィンガープリント", "FINGERPRINT")}</h2>
    <div class="card"><div class="field"><span class="field-label">${tr("パスフレーズなし", "WITHOUT A PASSPHRASE")}</span><span class="data">${fingerprint("")}</span></div>
      <div class="field"><span class="field-label">${tr("入力したパスフレーズ", "WITH THIS PASSPHRASE")}</span><span class="data" id="typed-fingerprint">${none}</span>
        <span class="field-note">${tr("控えておいたフィンガープリントと同じか確かめてください。1文字違うだけで別の鍵になります。", "Check it matches the fingerprint you noted. One wrong character makes a different key.")}</span></div></div>`,
    `<p class="caption">${seedQr ? tr("ウォレットを開くと、単語はメモリから消えます。SeedQRは、その前にここで表示できます。", "Opening the wallet clears the words from memory. Show the SeedQR here before that.")
      : tr("ウォレットを開くと、単語はメモリから消えます。", "Opening the wallet clears the words from memory.")}</p>
    ${seedQr ? button("passphrase-seedqr", tr("SeedQRを表示", "Show SeedQR"), "secondary") : ""}${button("passphrase-continue", tr("ウォレットを開く", "Open the wallet"), "primary")}`, () => cancel());
  view.querySelector("#passphrase-seedqr")?.addEventListener("click", () => void showSeedQr((compact) => call<{ payload: number[] }>("seed_qr", compact).payload));
  const input = view.querySelector<HTMLInputElement>("#passphrase")!;
  const typed = view.querySelector<HTMLElement>("#typed-fingerprint")!;
  let timer = 0;
  let cancel = () => {};
  // Waits for typing to pause, since each fingerprint runs the 2048 round BIP39 stretch
  input.addEventListener("input", () => {
    clearTimeout(timer);
    typed.textContent = input.value ? tr("計算しています…", "Working…") : none;
    if (input.value) timer = setTimeout(() => { typed.textContent = fingerprint(input.value); }, 500);
  });
  return new Promise((resolve, reject) => {
    const close = () => { clearTimeout(timer); input.value = ""; view.remove(); };
    cancel = () => { close(); reject(tr("鍵の読み込みをやめました。", "Seed import was cancelled")); };
    view.querySelector("#passphrase-continue")!.addEventListener("click", () => { const value = input.value; close(); resolve(value); });
  });
}

// The address check: scan the wallet app's receive QR or type the address
async function checkAddress(): Promise<void> {
  const view = step(tr("アドレスの確認", "Address check"), `<div class="question"><h1>${tr("アドレスを確認する", "Check an address")}</h1>
      <p class="lead">${tr("ウォレットアプリに出た受け取りのアドレスが、この鍵のものか確かめます。QRを読み取るか、アドレスを入力してください。", "Check that a receive address shown in your wallet app belongs to this key. Scan its QR or type it.")}</p></div>
    <input class="input" id="address" autocomplete="off" spellcheck="false" placeholder="${tr("アドレスかbitcoin: URI", "Address or bitcoin: URI")}">
    ${webDemo ? `<button class="link" id="address-test">${tr("テスト用のアドレスを使う", "Use the test address")}</button>` : ""}
    <p class="problem" id="address-problem" hidden></p>
    <h2 class="overline">${tr("探す範囲", "SEARCH RANGE")}</h2>
    <div class="range"><label>${tr("アカウント", "Account")}<input class="input" id="address-account" inputmode="numeric" value="0"></label>
      <label>${tr("それぞれ探す数", "Addresses per chain")}<input class="input" id="address-count" inputmode="numeric" value="1000"></label></div>
    <p class="caption">${tr("受け取りとおつりのアドレスを、それぞれ最初から探す数だけ調べます。", "The first addresses of the receive and change chains are checked, this many of each.")}</p>`,
    button("address-scan", tr("QRを読み取る", "Scan a QR"), "secondary") + button("address-check", tr("調べる", "Check"), "primary"), () => cancel());
  const field = (id: string) => view.querySelector<HTMLInputElement>(`#${id}`)!;
  const problem = view.querySelector<HTMLElement>("#address-problem")!;
  let cancel = () => {};
  const search = await new Promise<{ address: string; account: number; count: number }>((resolve, reject) => {
    cancel = () => { view.remove(); reject(tr("アドレスの確認をやめました。", "Address search was cancelled")); };
    const check = () => {
      const address = field("address").value.trim().replace(/^bitcoin:/i, "").split("?")[0];
      const account = Number(field("address-account").value);
      const count = Number(field("address-count").value);
      if (!address || !Number.isInteger(account) || account < 0 || !Number.isInteger(count) || count < 1 || count > 100000) {
        problem.textContent = tr("アドレスと、0以上のアカウント、1〜100000の探す数を入れてください。", "Enter an address, an account of 0 or more, and 1 to 100000 addresses.");
        problem.hidden = false;
        return;
      }
      view.remove();
      resolve({ address, account, count });
    };
    view.querySelector("#address-test")?.addEventListener("click", () => { field("address").value = testAddress; check(); });
    view.querySelector("#address-check")!.addEventListener("click", check);
    // Cancelling the scan leaves this screen open, so the address can still be typed
    view.querySelector("#address-scan")!.addEventListener("click", () => scan("address", (text) => ({ done: text })).then((text) => { field("address").value = text; check(); }, () => undefined));
  });
  const result = call<{ found: boolean; chain?: number; index?: number }>("find_address", search.address, search.account, search.count);
  const chain = result.chain === 0 ? tr("受け取り", "Receive") : tr("おつり", "Change");
  const shown = step(tr("アドレスの確認", "Address check"), `<div class="question"><h1>${result.found ? tr("このウォレットのアドレスです", "This address is yours") : tr("見つかりませんでした", "Not found")}</h1>
      <p class="lead">${result.found ? tr("この鍵から作られたアドレスです。", "It was made from this key.")
        : tr(`アカウント ${search.account} の受け取りとおつり、それぞれ最初の${search.count}個にはありません。別のウォレットのアドレスか、探す範囲の外です。`,
          `It is not among the first ${search.count} receive and change addresses of account ${search.account}. It belongs to another wallet or lies outside the range.`)}</p></div>
    <div class="card"><div class="field"><span class="field-label">${tr("アドレス", "ADDRESS")}</span><span class="data">${escape(search.address.match(/.{1,4}/g)!.join(" "))}</span></div>
      ${result.found ? `<div class="field"><span class="field-label">${tr("場所", "WHERE")}</span><span class="data-plain">${tr(`${chain}・番号 ${result.index}`, `${chain} · index ${result.index}`)}</span>
        <span class="field-note">${tr(`アカウント ${search.account}`, `Account ${search.account}`)}</span></div>` : ""}</div>`,
    button("address-again", tr("別のアドレスを調べる", "Check another address"), "secondary") + button("address-done", tr("完了", "Done"), "primary"), () => done());
  let done = () => {};
  const again = await new Promise<boolean>((resolve) => {
    done = () => { shown.remove(); resolve(false); };
    shown.querySelector("#address-done")!.addEventListener("click", done);
    shown.querySelector("#address-again")!.addEventListener("click", () => { shown.remove(); resolve(true); });
  });
  if (again) return checkAddress();
}

// The engine's pending seed (scanned, typed or opened from storage): its passphrase, loading, and the
// offer to save it. The engine lets it go whichever way this ends
async function loadPending(offerToSave: boolean) {
  try {
    const passphrase = new TextEncoder().encode(await askPassphrase());
    call("seed_load", passphrase);
    passphrase.fill(0);
    if (offerToSave && webApp && storageOn()) await offerSave();
  } finally {
    call("seed_wipe");
  }
}

export async function loadWords(words: Uint8Array) {
  call("seed_words", words);
  words.fill(0);
  await loadPending(true);
}

const keyName = (key: Saved) => key.name ?? tr(`鍵 ${key.fingerprint}`, `Key ${key.fingerprint}`);

// Saving is a choice per key, under a name: the words or SeedQR are sealed in the engine with the passkey's
// secret. The fingerprint kept names the words alone, since one seed can open with several passphrases
async function offerSave() {
  const fingerprint = call<{ fingerprint: string }>("seed_preview", new Uint8Array()).fingerprint;
  let name = "";
  const choice = await dialog(tr("この鍵をこの端末に保存しますか", "Save this key on this device?"),
    tr("パスキーで暗号化して保存します。開くたびにFace ID、指紋、または端末のパスコードが必要です。パスフレーズは保存しません。ブラウザのデータは消えることがあるので、紙のバックアップは必ず残してください。",
      "It is encrypted with this app's passkey and needs Face ID, a fingerprint or the device passcode each time it opens. The passphrase is not saved. Browser data can be cleared, so always keep the paper backup."),
    [["save-no", tr("今はしない", "Not now")], ["save-yes", tr("保存する", "Save"), true]],
    { body: `<input class="input" id="save-name" autocomplete="off" spellcheck="false" placeholder="${tr("名前", "Name")}" value="${escape(keyName({ fingerprint } as Saved))}">`,
      check: (_, box) => { name = box.querySelector<HTMLInputElement>("#save-name")!.value.trim(); return true; } });
  if (choice !== "save-yes") return;
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  try {
    const secret = await passkeySecret();
    try {
      const sealed = call<{ data: string; mnemonic: boolean }>("seed_seal", secret, nonce);
      setSavedKeys([...savedKeys(), { name: name || keyName({ fingerprint } as Saved), mnemonic: sealed.mnemonic, fingerprint, nonce: hex(nonce), data: sealed.data, created: new Date().toISOString() }]);
    } finally {
      secret.fill(0);
    }
  } catch (error) {
    await dialog(tr("鍵を保存できませんでした", "The key was not saved"), String(error), [["save-ok", "OK", true]]);
  }
}

// One saved key: open it, or delete this device's copy after asking. Back returns to the list
async function savedKey(key: Saved): Promise<"open" | "delete" | null> {
  let back = () => {};
  const view = step(tr("保存した鍵", "Saved keys"), `<div class="question"><h1>${escape(keyName(key))}</h1></div>
    <div class="card"><div class="field"><span class="field-label">${tr("フィンガープリント", "FINGERPRINT")}</span><span class="data">${key.fingerprint}</span>
      <span class="field-note">${tr("ウォレットアプリに表示されるものと同じか確かめてください。", "Check it matches the one your wallet app shows.")}</span></div></div>`,
    button("saved-open", tr("開く", "Open"), "primary") + button("saved-delete", tr("この鍵を削除", "Delete this key"), "danger"), () => back());
  return new Promise((resolve) => {
    const done = (action: "open" | "delete" | null) => { view.remove(); resolve(action); };
    back = () => done(null);
    view.querySelector("#saved-open")!.addEventListener("click", () => done("open"));
    view.querySelector("#saved-delete")!.addEventListener("click", async () => {
      const choice = await dialog(tr(`${keyName(key)}を削除しますか`, `Delete ${keyName(key)}?`),
        tr("この端末にある写しだけを削除します。元に戻すには、バックアップが必要です。", "Only the copy on this device is deleted. You need your backup to restore it."),
        [["delete-cancel", tr("キャンセル", "Cancel")], ["delete-confirm", tr("削除する", "Delete"), true]]);
      if (choice === "delete-confirm") done("delete");
    });
  });
}

async function openSaved(key: Saved) {
  const secret = await passkeySecret();
  try {
    call("seed_open", unhex(key.data), secret, unhex(key.nonce), key.mnemonic ? 1 : 0);
  } finally {
    secret.fill(0);
  }
  try {
    const passphrase = new TextEncoder().encode(await askPassphrase(tr(`${keyName(key)}のパスフレーズ`, `Passphrase for ${keyName(key)}`)));
    call("seed_load", passphrase);
    passphrase.fill(0);
  } finally {
    call("seed_wipe");
  }
}

async function unlockSaved() {
  for (;;) {
    const keys = savedKeys();
    if (!keys.length) throw tr("この端末に保存した鍵はありません。", "No keys are saved on this device.");
    const picked = await choose(tr("保存した鍵", "Saved keys"), tr("開く鍵を選んでください", "Choose a key to open"),
      tr("開くときに、Face ID、指紋、または端末のパスコードと、付けていればパスフレーズを入力します。", "Opening asks for Face ID, a fingerprint or the device passcode, then the passphrase if the key has one."),
      keys.map((k) => [keyName(k), tr(`フィンガープリント ${k.fingerprint}`, `Fingerprint ${k.fingerprint}`)]));
    if (picked < 0) throw tr("鍵を開くのをやめました。", "Unlock was cancelled");
    const action = await savedKey(keys[picked]);
    if (action === "open") return openSaved(keys[picked]);
    if (action === "delete") return setSavedKeys(keys.filter((_, i) => i !== picked));
  }
}

// Switching to memory only erases what is saved, so nothing stays behind that the setting says is not there
async function confirmErase(turningOff: boolean) {
  const count = savedKeys().length;
  const choice = await dialog(turningOff ? tr("メモリのみに切り替えますか", "Switch to memory only?") : tr("保存した鍵をすべて消去しますか", "Erase every saved key?"),
    turningOff ? tr(`この端末に保存した${count}件の鍵を消去します。元に戻すには、バックアップが必要です。`, `The ${count} saved key${count === 1 ? "" : "s"} on this device will be erased. You need your backups to restore them.`)
      : tr("この端末にある写しだけを消去します。元に戻すには、バックアップが必要です。", "Only the copies on this device are erased. You need your backups to restore them."),
    [["erase-cancel", tr("キャンセル", "Cancel")], ["erase-confirm", turningOff ? tr("消去して切り替える", "Erase and switch") : tr("消去する", "Erase"), true]]);
  if (choice !== "erase-confirm") throw turningOff ? tr("鍵の保存はオンのままです。", "Key storage was left on") : tr("消去をやめました。", "Erase was cancelled");
}

export async function webInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  await ready;
  switch (command) {
    case "state":
      return state() as T;
    case "set_network":
      if (webApp) call("set_network", args?.testnet === true ? 1 : 0);
      return state() as T;
    case "import_mnemonic":
      await loadWords(await askWords());
      return state() as T;
    case "scan_seed_qr":
      await scanSeed();
      await loadPending(true);
      return state() as T;
    case "unlock_saved":
      await unlockSaved();
      return state() as T;
    case "set_storage":
      if (args?.enabled === true) await enableStorage();
      else {
        if (savedKeys().length) await confirmErase(true);
        disableStorage();
      }
      return state() as T;
    case "erase_saved":
      await confirmErase(false);
      setSavedKeys([]);
      return state() as T;
    case "parser_info":
      return call("parser_info") as T;
    case "demo_seed": {
      await loadWords(new TextEncoder().encode(testMnemonic));
      return state() as T;
    }
    case "find_address":
      await checkAddress();
      return undefined as T;
    case "scan_psbt": {
      await reviewPsbt(await scanPsbt());
      const { frames } = call<{ frames: string[] }>("sign");
      await showFrames(frames, { kind: "signed" });
      return { ...state(), signed: true, shown: true } as T;
    }
    case "create_mnemonic":
      await createWallet();
      return { ...state(), shown: true } as T;
    case "export_account": {
      const purpose = await chooseAccount();
      if (purpose === null) {
        const { frames } = call<{ frames: string[] }>("account_ur", 0);
        await showFrames(frames, { kind: "account", heading: tr("ウォレットアプリに登録する", "Register in your wallet app"), name: "crypto-account",
          description: tr("ウォレットアプリで読み取ってください。BIP49、BIP84、BIP86とBIP48のマルチシグ用の公開鍵を、1つのアニメーションQRで書き出します。", "Scan with your wallet: BIP49, BIP84, BIP86 and the BIP48 multisig key in one animated QR.") });
      } else {
        const { frames } = call<{ frames: string[] }>("account", purpose, 0);
        await showFrames(frames, { kind: "account", heading: `BIP${purpose}`, interval: 1500,
          description: tr("ウォレットアプリで読み取ってください。xpubとディスクリプターが自動で切り替わります。", "Scan with your wallet. The xpub and descriptor alternate automatically.") });
      }
      return undefined as T;
    }
    case "register_multisig":
      await registerMultisig();
      return state() as T;
    case "export_multisig":
      await exportMultisig();
      return state() as T;
    case "forget_multisig":
      call("multisig_forget");
      return state() as T;
    case "sign_message":
      await signMessage();
      return { shown: true } as T;
    case "bip85_mnemonic":
      await bip85();
      return { shown: true } as T;
    case "lock":
      call("lock");
      return undefined as T;
    default:
      throw tr("ブラウザ版のデモでは使えません。", "Not available in the browser demo.");
  }
}
