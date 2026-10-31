import qrcode from "qrcode-generator";
import { icon } from "../design/icons";
import { webApp, webDemo } from "../signer";
import type { SignerState } from "../signer";
import { tr } from "../views";
import { createWallet, step } from "./create";
import { canStore, disableStorage, enableStorage, hex, passkeySecret, savedKeys, setSavedKeys, storageOn, unhex } from "./keystore";
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

// A full-screen step over the app, laid out like the native ones
export function sheet(title: string, body: string, actions: string) {
  const network = call<SignerState>("state").testnet ? tr("テストネット", "Testnet") : tr("メインネット", "Mainnet");
  const element = document.createElement("div");
  element.className = "sheet";
  element.innerHTML = `<div class="app-shell">
    <header class="topbar"><span class="topbar-title">${title}</span>
      <span class="topbar-status"><span class="pill pill-neutral">${icon("check", 16)}<span>${network}</span></span></span></header>
    <main class="screen-body">${body}</main>
    <footer class="screen-actions">${actions}</footer>
  </div>`;
  (document.querySelector(".phone") ?? document.body).append(element);
  return element;
}

// Hands each frame of the back camera to `onFrame` as greyscale, until it returns true or the returned
// function stops it. Frames are scaled down to the reader's limit of 1280x720 pixels and 1280 a side
function startCamera(view: HTMLElement, status: HTMLElement, onFrame: (grey: Uint8Array, w: number, h: number) => boolean) {
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
      const done = onFrame(grey, w, h);
      grey.fill(0);
      if (done) return;
    }
    requestAnimationFrame(tick);
  };
  navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } }).then((media) => {
    if (stopped) return media.getTracks().forEach((track) => track.stop());
    stream = media;
    video.srcObject = media;
    void video.play();
    status.textContent = tr("QRを枠の中に合わせてください", "Fit the QR inside the frame");
    tick();
  }).catch(() => { status.textContent = tr("カメラを使えません。", "The camera is not available."); });
  return () => {
    stopped = true;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };
}

type Frame = { found: boolean; code: number; text?: string };

function scanPsbt(): Promise<Review> {
  call("reset_ur");
  const view = sheet(tr("読み取り", "Scan"), `<div class="question"><h1>${tr("取引のQRを読み取る", "Scan the transaction QR")}</h1>
      <p class="lead">${tr("ウォレットアプリのアニメーションQRをカメラに向けてください。読み取りは自動で進みます。", "Point the camera at your wallet app's animated QR. Scanning continues as frames arrive.")}</p></div>
    <div class="camera"><video playsinline muted></video></div>
    <p class="caption" id="scan-status">${tr("カメラを準備しています", "Starting the camera")}</p>
    ${webDemo ? `<p class="caption">${tr("カメラがないときは、テスト用の取引で試せます。", "Without a camera, try the test transaction.")}</p>` : ""}`,
    (webDemo ? button("scan-test", tr("テスト用の取引を使う", "Use the test transaction"), "secondary") : "") + button("scan-cancel", tr("キャンセル", "Cancel"), "secondary"));
  const status = view.querySelector<HTMLElement>("#scan-status")!;
  return new Promise((resolve, reject) => {
    const finish = (error?: string, review?: Review) => {
      stop();
      view.remove();
      if (review) resolve(review); else reject(error);
    };
    const receive = (text: string) => {
      try {
        const result = call<{ complete: boolean; progress: number | string; review?: Review }>("receive_ur", text.toLowerCase());
        if (result.complete) finish(undefined, result.review);
        else status.textContent = tr(`受信中・${result.progress}`, `Receiving frames · ${result.progress}`);
      } catch (error) {
        call("reset_ur");
        status.textContent = String(error);
      }
    };
    let last = "";
    const stop = startCamera(view, status, (grey, w, h) => {
      const frame = call<Frame>("qr_frame", grey, w, h, 2);
      if (frame.found && frame.text && frame.text !== last) {
        last = frame.text;
        receive(frame.text);
      } else if (frame.code === -3) {
        status.textContent = tr("取引のQRではありません", "This is not a transaction QR");
      }
      return false;
    });
    view.querySelector("#scan-test")?.addEventListener("click", () => receive(testPsbt));
    view.querySelector("#scan-cancel")!.addEventListener("click", () => finish(tr("QRの読み取りをやめました。", "QR scan was cancelled")));
  });
}

// The engine reads the SeedQR from the camera's frames and keeps it: the page learns only that one was found
function scanSeed(): Promise<void> {
  const view = sheet(tr("読み取り", "Scan"), `<div class="question"><h1>${tr("バックアップのQRを読み取る", "Scan your backup QR")}</h1>
      <p class="lead">${tr("SeedQRかCompactSeedQRをカメラに向けてください。", "Point the camera at your SeedQR or CompactSeedQR.")}</p></div>
    <div class="camera"><video playsinline muted></video></div>
    <p class="caption" id="scan-status">${tr("カメラを準備しています", "Starting the camera")}</p>`,
    button("scan-cancel", tr("キャンセル", "Cancel"), "secondary"));
  const status = view.querySelector<HTMLElement>("#scan-status")!;
  return new Promise((resolve, reject) => {
    const stop = startCamera(view, status, (grey, w, h) => {
      const frame = call<Frame>("qr_frame", grey, w, h, 1);
      if (frame.found) {
        stop();
        view.remove();
        resolve();
        return true;
      }
      if (frame.code === -3) status.textContent = tr("SeedQRではありません", "This is not a SeedQR");
      return false;
    });
    view.querySelector("#scan-cancel")!.addEventListener("click", () => { stop(); view.remove(); reject(tr("鍵の読み込みをやめました。", "Seed import was cancelled")); });
  });
}

// Third-party keyboards can record what is typed, which the page cannot block as the native apps do
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
      <span class="${external ? "amount" : "data"}">${btc(output.amount)} BTC</span>
      ${note ? `<span class="field-note">${note}</span>` : ""}
    </div>
    <label class="check"><input type="checkbox">${output.kind === "Address" ? tr("このアドレスを確かめました", "I checked this address") : tr("この出力を確かめました", "I checked this output")}</label>
  </div>`;
}

// Every output checked and the end reached before signing, then asked once more, as on the phones
function reviewPsbt(review: Review): Promise<void> {
  const view = sheet(tr("署名の確認", "Review"), `<div class="question"><h1>${tr("この取引に署名しますか", "Sign this transaction?")}</h1></div>
    <div class="card">
      <div class="field"><span class="field-label">${tr("送る金額", "Amount sent")}</span><span class="amount">${btc(review.spend)} BTC</span></div>
      <div class="field"><span class="field-label">${tr("ネットワーク手数料", "Network fee")}</span><span class="data">${btc(review.fee)} BTC</span>
        <span class="field-note">${tr("受取人ではなく、マイナーに支払われます。", "Paid to miners, not to the recipient.")}</span></div>
      <div class="field"><span class="field-label">${tr("署名する入力", "Inputs to sign")}</span><span class="data">${tr(`${review.signatures}件`, `${review.signatures}`)}</span>
        <span class="field-note">${tr(`入力の合計 ${btc(review.totalIn)} BTC`, `Total input ${btc(review.totalIn)} BTC`)}</span></div>
    </div>
    <section class="group"><h2 class="overline">${tr(`送り先とおつり・${review.outputs.length}件`, `SEND TO AND CHANGE · ${review.outputs.length}`)}</h2>
      ${review.outputs.map((output, index) => outputCard(output, index, review.outputs.length)).join("")}</section>
    <p>${tr("署名すると、この内容で送金できるようになります。", "Once signed, this payment can be sent as shown.")}</p>
    <p class="caption">${tr("すべての項目を確かめ、最後までスクロールすると署名できます。", "Check every item and scroll to the end to sign.")}</p>`,
    button("review-sign", tr("署名する", "Sign transaction"), "primary") + button("review-cancel", tr("キャンセル", "Cancel"), "secondary"));
  const body = view.querySelector<HTMLElement>(".screen-body")!;
  const footer = view.querySelector<HTMLElement>(".screen-actions")!;
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
    const cancel = () => { call("cancel_review"); view.remove(); reject(tr("署名をやめました。", "Signing was cancelled")); };
    view.querySelector("#review-cancel")!.addEventListener("click", cancel);
    sign.addEventListener("click", () => {
      footer.innerHTML = `<p class="heading">${tr("署名してよいですか", "Sign it now?")}</p>
        <p class="caption">${tr("署名した取引は、ウォレットアプリで読み取るQRとして表示します。", "The signed transaction is shown as QR codes for your wallet app to scan.")}</p>
        ${button("confirm-sign", tr("署名する", "Sign"), "primary")}${button("confirm-cancel", tr("キャンセル", "Cancel"), "secondary")}`;
      footer.querySelector("#confirm-sign")!.addEventListener("click", () => { view.remove(); resolve(); });
      footer.querySelector("#confirm-cancel")!.addEventListener("click", cancel);
    });
  });
}

function qrSvg(frame: string) {
  const code = qrcode(0, "L");
  // URs are case-insensitive, and upper case fits the denser alphanumeric mode
  if (/^ur:/i.test(frame)) code.addData(frame.toUpperCase(), "Alphanumeric"); else code.addData(frame);
  code.make();
  return code.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
}

function showFrames(heading: string, name: string, frames: string[], note: string): Promise<void> {
  const view = sheet(heading, `<div class="question"><h1>${tr("ウォレットアプリで読み取ってください", "Scan this with your wallet app")}</h1></div>
    <div class="qr-card"></div>
    <p class="caption" id="qr-count"></p>
    <p class="caption">${note}</p>`, button("qr-done", tr("完了", "Done"), "primary"));
  const card = view.querySelector<HTMLElement>(".qr-card")!;
  const count = view.querySelector<HTMLElement>("#qr-count")!;
  const images = frames.map(qrSvg);
  let current = 0;
  const show = () => {
    card.innerHTML = images[current];
    count.textContent = frames.length > 1
      ? tr(`${name}・${current + 1} / ${frames.length}・自動で切り替え`, `${name} · ${current + 1} / ${frames.length} · auto`) : name;
    current = (current + 1) % frames.length;
  };
  show();
  const timer = setInterval(show, 350);
  return new Promise((resolve) => view.querySelector("#qr-done")!.addEventListener("click", () => { clearInterval(timer); view.remove(); resolve(); }));
}

// The fingerprint with no passphrase and with the typed one, as on the phones
function askPassphrase(preview: (passphrase: Uint8Array) => { fingerprint: string }): Promise<string> {
  const none = tr("入力すると表示します", "Shown as you type");
  const fingerprint = (passphrase: string) => {
    const bytes = new TextEncoder().encode(passphrase);
    const { fingerprint } = preview(bytes);
    bytes.fill(0);
    return fingerprint.replace(/^(.{4})/, "$1 ");
  };
  const view = step(tr("パスフレーズ", "Passphrase"), `<div class="question"><h1>${tr("パスフレーズを入力する", "Enter the passphrase")}</h1>
      <p class="lead">${tr("単語にパスフレーズを足すと、別の鍵になります。付けていない場合は、空のまま続けてください。", "A passphrase added to the words makes a different key. If this seed has none, leave it blank and continue.")}</p></div>
    <input class="input" id="passphrase" type="password" autocomplete="off" spellcheck="false" placeholder="${tr("パスフレーズ", "Passphrase")}">
    ${webDemo ? `<p class="caption">${tr("テスト用の単語では、TREZOR と入れると b4e3 f5ed になります。", "With the test words, TREZOR gives b4e3 f5ed.")}</p>` : ""}
    <h2 class="overline">${tr("フィンガープリント", "FINGERPRINT")}</h2>
    <div class="card"><div class="field"><span class="field-label">${tr("パスフレーズなし", "WITHOUT A PASSPHRASE")}</span><span class="data">${fingerprint("")}</span></div>
      <div class="field"><span class="field-label">${tr("入力したパスフレーズ", "WITH THIS PASSPHRASE")}</span><span class="data" id="typed-fingerprint">${none}</span>
        <span class="field-note">${tr("控えておいたフィンガープリントと同じか確かめてください。1文字違うだけで別の鍵になります。", "Check it matches the fingerprint you noted. One wrong character makes a different key.")}</span></div></div>`,
    button("passphrase-continue", tr("続ける", "Continue"), "primary"), () => cancel());
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

// The address check, with the test words' first receive address in place of a camera
async function checkAddress(): Promise<void> {
  const view = step(tr("アドレスの確認", "Address check"), `<div class="question"><h1>${tr("アドレスを確認する", "Check an address")}</h1>
      <p class="lead">${tr("ウォレットアプリに出た受け取りのアドレスが、この鍵のものか確かめます。QRを読み取るか、アドレスを入力してください。", "Check that a receive address shown in your wallet app belongs to this key. Scan its QR or type it.")}</p></div>
    <input class="input" id="address" autocomplete="off" spellcheck="false" placeholder="${tr("アドレスかbitcoin: URI", "Address or bitcoin: URI")}">
    ${webDemo ? `<p class="caption">${tr("ブラウザ版ではカメラの代わりに、テスト用のアドレスで試せます。", "The browser demo has the test address in place of a camera.")}</p>` : ""}
    <p class="problem" id="address-problem" hidden></p>
    <h2 class="overline">${tr("探す範囲", "SEARCH RANGE")}</h2>
    <div class="range"><label>${tr("アカウント", "Account")}<input class="input" id="address-account" inputmode="numeric" value="0"></label>
      <label>${tr("それぞれ探す数", "Addresses per chain")}<input class="input" id="address-count" inputmode="numeric" value="1000"></label></div>
    <p class="caption">${tr("受け取りとおつりのアドレスを、それぞれ最初から探す数だけ調べます。", "The first addresses of the receive and change chains are checked, this many of each.")}</p>`,
    (webDemo ? button("address-test", tr("テスト用のアドレスを使う", "Use the test address"), "secondary") : "") + button("address-check", tr("調べる", "Check"), "primary"), () => cancel());
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
  });
  const result = call<{ found: boolean; chain?: number; index?: number }>("find_address", search.address, search.account, search.count);
  const chain = result.chain === 0 ? tr("受け取り", "Receive") : tr("おつり", "Change");
  const shown = step(tr("アドレスの確認", "Address check"), `<div class="question"><h1>${result.found ? tr("このウォレットのアドレスです", "This address is yours") : tr("見つかりませんでした", "Not found")}</h1>
      <p class="lead">${result.found ? tr("この鍵から作られたアドレスです。", "It was made from this key.")
        : tr(`アカウント ${search.account} の受け取りとおつり、それぞれ最初の${search.count}個にはありません。別のウォレットのアドレスか、探す範囲の外です。`,
          `It is not among the first ${search.count} receive and change addresses of account ${search.account}. It belongs to another wallet or lies outside the range.`)}</p></div>
    <div class="card"><div class="field"><span class="field-label">${tr("アドレス", "ADDRESS")}</span><span class="data">${escape(search.address.match(/.{1,4}/g)!.join(" "))}</span></div>
      ${result.found ? `<div class="field"><span class="field-label">${tr("場所", "WHERE")}</span><span class="data">${tr(`${chain}・番号 ${result.index}`, `${chain} · index ${result.index}`)}</span>
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

// Loads typed words with the passphrase asked for them, then clears the page's copies
// The engine's pending seed (scanned, typed or opened from storage): its passphrase, loading, and the
// offer to save it. The engine lets it go whichever way this ends
async function loadPending(offerToSave: boolean) {
  try {
    const passphrase = new TextEncoder().encode(await askPassphrase((p) => call("seed_preview", p)));
    call("seed_load", passphrase);
    passphrase.fill(0);
    if (offerToSave && webApp && storageOn()) await offerSave();
  } finally {
    call("seed_wipe");
  }
}

async function loadWords(words: Uint8Array) {
  call("seed_words", words);
  words.fill(0);
  await loadPending(true);
}

const fingerprintText = (fingerprint: string) => fingerprint.replace(/^(.{4})/, "$1 ");

// Saving is a choice per key: the words or SeedQR are sealed in the engine with the passkey's secret
async function offerSave() {
  const fingerprint = call<{ fingerprint: string }>("seed_preview", new Uint8Array()).fingerprint;
  const view = step(tr("鍵の保存", "Save key"), `<div class="question"><h1>${tr("この鍵をこの端末に保存しますか", "Save this key on this device?")}</h1>
      <p class="lead">${tr("パスキーで暗号化して保存します。開くたびにFace ID、指紋、または端末のパスコードが必要です。パスフレーズは保存しません。", "It is encrypted with this app's passkey and needs Face ID, a fingerprint or the device passcode each time it opens. The passphrase is not saved.")}</p></div>
    <div class="card"><div class="field"><span class="field-label">${tr("フィンガープリント(パスフレーズなし)", "FINGERPRINT (NO PASSPHRASE)")}</span><span class="data">${fingerprintText(fingerprint)}</span></div></div>
    <p class="caption">${tr("ブラウザのデータは消えることがあります。紙のバックアップは必ず残してください。", "Browser data can be cleared. Always keep the paper backup.")}</p>`,
    button("save-no", tr("保存しない", "Don't save"), "secondary") + button("save-yes", tr("保存する", "Save"), "primary"), () => done(false));
  let done = (_: boolean) => {};
  const save = await new Promise<boolean>((resolve) => {
    done = (choice) => { view.remove(); resolve(choice); };
    view.querySelector("#save-no")!.addEventListener("click", () => done(false));
    view.querySelector("#save-yes")!.addEventListener("click", () => done(true));
  });
  if (!save) return;
  const secret = await passkeySecret();
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  try {
    const sealed = call<{ data: string; mnemonic: boolean }>("seed_seal", secret, nonce);
    setSavedKeys([...savedKeys(), { mnemonic: sealed.mnemonic, fingerprint, nonce: hex(nonce), data: sealed.data, created: new Date().toISOString() }]);
  } finally {
    secret.fill(0);
  }
}

// One saved key, picked from a list when there are several
function chooseSaved() {
  const keys = savedKeys();
  if (keys.length === 1) return Promise.resolve(keys[0]);
  const view = step(tr("保存した鍵", "Saved keys"), `<div class="question"><h1>${tr("開く鍵を選ぶ", "Choose a key to open")}</h1></div>
    <div class="card">${keys.map((k, i) => `<button class="row" id="saved-${i}"><span class="row-copy"><span class="row-title">${fingerprintText(k.fingerprint)}</span>
      <span class="row-detail">${k.mnemonic ? tr("シードフレーズ", "Recovery words") : "SeedQR"} · ${new Date(k.created).toLocaleDateString()}</span></span></button>`).join("")}</div>`,
    "", () => cancel());
  let cancel = () => {};
  return new Promise<(typeof keys)[number]>((resolve, reject) => {
    cancel = () => { view.remove(); reject(tr("鍵の読み込みをやめました。", "Seed import was cancelled")); };
    keys.forEach((k, i) => view.querySelector(`#saved-${i}`)!.addEventListener("click", () => { view.remove(); resolve(k); }));
  });
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
    case "unlock_saved": {
      const key = await chooseSaved();
      const secret = await passkeySecret();
      try {
        call("seed_open", unhex(key.data), secret, unhex(key.nonce), key.mnemonic ? 1 : 0);
      } finally {
        secret.fill(0);
      }
      await loadPending(false);
      return state() as T;
    }
    case "set_storage":
      if (args?.enabled === true) await enableStorage();
      else disableStorage();
      return state() as T;
    case "erase_saved":
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
      await showFrames(tr("署名済み", "Signed"), "crypto-psbt", frames, tr("読み取りが終わったら、ウォレットアプリから送金してください。", "When it has scanned, send the payment from your wallet app."));
      return { ...state(), signed: true, shown: true } as T;
    }
    case "create_mnemonic":
      await createWallet();
      return { ...state(), shown: true } as T;
    case "export_account": {
      const { frames } = call<{ frames: string[] }>("account_ur", 0);
      await showFrames(tr("ウォレットアプリと接続する", "Connect your wallet app"), "crypto-account", frames, tr("秘密鍵は含まれていません。", "No private keys are included."));
      return undefined as T;
    }
    case "lock":
      call("lock");
      return undefined as T;
    default:
      throw tr("ブラウザ版のデモでは使えません。", "Not available in the browser demo.");
  }
}
