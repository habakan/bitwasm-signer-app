import jsQR from "jsqr";
import type { QRCode } from "jsqr";
import qrcode from "qrcode-generator";
import { icon } from "../design/icons";
import { webApp, webDemo } from "../signer";
import type { SignerState } from "../signer";
import { tr } from "../views";
import { createWallet, step } from "./create";
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
  return { ...engine, testnet: webDemo || engine.testnet, storage: false, deviceSecure: false,
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

// Reads QR codes with the back camera into the sheet's video until the returned function stops it
function startCamera(view: HTMLElement, status: HTMLElement, onCode: (code: QRCode) => void) {
  const video = view.querySelector("video")!;
  const canvas = document.createElement("canvas");
  let stream: MediaStream | null = null;
  let stopped = false;
  let last = "";
  const tick = () => {
    if (!stream) return;
    if (video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(video, 0, 0);
      const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
      const key = code?.binaryData.join() ?? "";
      if (code && key && key !== last) { last = key; onCode(code); }
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
    const stop = startCamera(view, status, (code) => receive(code.data));
    view.querySelector("#scan-test")?.addEventListener("click", () => receive(testPsbt));
    view.querySelector("#scan-cancel")!.addEventListener("click", () => finish(tr("QRの読み取りをやめました。", "QR scan was cancelled")));
  });
}

// A standard SeedQR is digits and a CompactSeedQR is bytes; the engine takes either as read
function scanSeed(): Promise<Uint8Array> {
  const view = sheet(tr("読み取り", "Scan"), `<div class="question"><h1>${tr("バックアップのQRを読み取る", "Scan your backup QR")}</h1>
      <p class="lead">${tr("SeedQRかCompactSeedQRをカメラに向けてください。", "Point the camera at your SeedQR or CompactSeedQR.")}</p></div>
    <div class="camera"><video playsinline muted></video></div>
    <p class="caption" id="scan-status">${tr("カメラを準備しています", "Starting the camera")}</p>`,
    button("scan-cancel", tr("キャンセル", "Cancel"), "secondary"));
  const status = view.querySelector<HTMLElement>("#scan-status")!;
  return new Promise((resolve, reject) => {
    const stop = startCamera(view, status, (code) => { stop(); view.remove(); resolve(new Uint8Array(code.binaryData)); });
    view.querySelector("#scan-cancel")!.addEventListener("click", () => { stop(); view.remove(); reject(tr("鍵の読み込みをやめました。", "Seed import was cancelled")); });
  });
}

// Third-party keyboards can record what is typed, which the page cannot block as the native apps do
function askWords(): Promise<Uint8Array> {
  const view = step(tr("シードフレーズ", "Recovery words"), `<div class="question"><h1>${tr("シードフレーズを入力する", "Type your recovery words")}</h1>
      <p class="lead">${tr("12〜24個の単語を、スペースで区切って入力してください。", "Type the 12 to 24 words, separated by spaces.")}</p></div>
    <textarea class="input" id="words" rows="6" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>
    <p class="problem" id="words-problem" hidden></p>
    <p class="caption">${tr("サードパーティ製キーボードは入力を記録できます。端末に最初から入っているキーボードを使ってください。", "Third-party keyboards can record what you type. Use the keyboard that came with the device.")}</p>`,
    button("words-continue", tr("続ける", "Continue"), "primary"), () => cancel());
  const field = view.querySelector<HTMLTextAreaElement>("#words")!;
  const problem = view.querySelector<HTMLElement>("#words-problem")!;
  let cancel = () => {};
  return new Promise((resolve, reject) => {
    const close = () => { field.value = ""; view.remove(); };
    cancel = () => { close(); reject(tr("鍵の読み込みをやめました。", "Seed import was cancelled")); };
    view.querySelector("#words-continue")!.addEventListener("click", () => {
      const words = new TextEncoder().encode(field.value.trim().toLowerCase().split(/\s+/).join(" "));
      try {
        call("preview_fingerprint", words, new Uint8Array(), 1);
      } catch (error) {
        problem.textContent = String(error);
        problem.hidden = false;
        return;
      }
      close();
      resolve(words);
    });
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
function askPassphrase(payload: Uint8Array, mnemonic: boolean): Promise<string> {
  const none = tr("入力すると表示します", "Shown as you type");
  const fingerprint = (passphrase: string) =>
    call<{ fingerprint: string }>("preview_fingerprint", payload, new TextEncoder().encode(passphrase), mnemonic ? 1 : 0).fingerprint.replace(/^(.{4})/, "$1 ");
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

// Loads a seed with the passphrase asked for it, then clears the page's copy
function loadSeed(name: string, payload: Uint8Array, passphrase: string) {
  const bytes = new TextEncoder().encode(passphrase);
  call(name, payload, bytes);
  payload.fill(0);
  bytes.fill(0);
}

export async function webInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  await ready;
  switch (command) {
    case "state":
      return state() as T;
    case "set_network":
      if (webApp) call("set_network", args?.testnet === true ? 1 : 0);
      return state() as T;
    case "import_mnemonic": {
      const words = await askWords();
      loadSeed("load_mnemonic", words, await askPassphrase(words, true));
      return state() as T;
    }
    case "scan_seed_qr": {
      const payload = await scanSeed();
      loadSeed("load_seed_qr", payload, await askPassphrase(payload, false));
      return state() as T;
    }
    case "parser_info":
      return call("parser_info") as T;
    case "demo_seed": {
      const words = new TextEncoder().encode(testMnemonic);
      loadSeed("load_mnemonic", words, await askPassphrase(words, true));
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
