import jsQR from "jsqr";
import qrcode from "qrcode-generator";
import { icon } from "../design/icons";
import type { SignerState } from "../signer";
import { tr } from "../views";
import { createWallet } from "./create";
import { call, startEngine } from "./engine";

// Published BIP39 test words and a testnet PSBT that spends from them (samples/psbt-ur-test-only.png)
const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const testPsbt = "UR:CRYPTO-PSBT/HDYLJOJKIDJYZMADAEGMAOAEAEAEADFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWFWAEAEAEAEAEZMZMZMZMADROLFADAEAEAEAEAECMAEBBFMEEMKHLSGJLUTSOZOENNLFZVESTTPVOLTFHGMNSAEAEAEAEAEADADCTNBLNADAEAEAEAEAECMAEBBRTTORFTBSRTESGLKKPUOHYSWDMRNGOEOBAYTBEVOCPAMAXDYTLGWTIUTFWBKJTHELGENDKYKWFFDDWPLECBSKKTLWTKPFRYKRNWSNSDPMEPEFNCSJKSKTNBKGHAEAELAAEAEAELAAEAEAELAAEAEAEAEAEAEAEAEAECPAOAXAOGUDKLOMNFWNYROVLUYPECTKSAOIELUNSTICKNDFPLRLPSKZSGSCWNDHGAEVYOLCSJKSKTNBKGHAEAELAAEAEAELAAEAEAELAADAEAEAEAEAEAEAEAEUYASYLBN";

type Output = { amount: number; owner: string; kind: string; text: string };
type Review = { spend: number; fee: number; totalIn: number; signatures: number; outputs: Output[] };

const ready = startEngine().then(() => call("set_network", 1));
const state = () => ({ ...call<SignerState>("state"), testnet: true, storage: false, deviceSecure: false, restrictions: [] });
const btc = (sats: number) => `${Math.floor(sats / 1e8)}.${String(sats % 1e8).padStart(8, "0")}`;
export const button = (id: string, label: string, variant: string) => `<button class="button button-${variant}" id="${id}"><span>${label}</span></button>`;
export const escape = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// A full-screen step over the app, laid out like the native ones
export function sheet(title: string, body: string, actions: string) {
  const element = document.createElement("div");
  element.className = "sheet";
  element.innerHTML = `<div class="app-shell">
    <header class="topbar"><span class="topbar-title">${title}</span>
      <span class="topbar-status"><span class="pill pill-neutral">${icon("check", 16)}<span>${tr("テストネット", "Testnet")}</span></span></span></header>
    <main class="screen-body">${body}</main>
    <footer class="screen-actions">${actions}</footer>
  </div>`;
  document.querySelector(".phone")!.append(element);
  return element;
}

function scanPsbt(): Promise<Review> {
  call("reset_ur");
  const view = sheet(tr("読み取り", "Scan"), `<div class="question"><h1>${tr("取引のQRを読み取る", "Scan the transaction QR")}</h1>
      <p class="lead">${tr("ウォレットアプリのアニメーションQRをカメラに向けてください。読み取りは自動で進みます。", "Point the camera at your wallet app's animated QR. Scanning continues as frames arrive.")}</p></div>
    <div class="camera"><video playsinline muted></video></div>
    <p class="caption" id="scan-status">${tr("カメラを準備しています", "Starting the camera")}</p>
    <p class="caption">${tr("カメラがないときは、テスト用の取引で試せます。", "Without a camera, try the test transaction.")}</p>`,
    button("scan-test", tr("テスト用の取引を使う", "Use the test transaction"), "secondary") + button("scan-cancel", tr("キャンセル", "Cancel"), "secondary"));
  const video = view.querySelector("video")!;
  const status = view.querySelector<HTMLElement>("#scan-status")!;
  const canvas = document.createElement("canvas");
  let stream: MediaStream | null = null;
  let last = "";
  return new Promise((resolve, reject) => {
    const finish = (error?: string, review?: Review) => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
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
    const tick = () => {
      if (!stream) return;
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true })!;
        context.drawImage(video, 0, 0);
        const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code?.data && code.data !== last) { last = code.data; receive(code.data); }
      }
      requestAnimationFrame(tick);
    };
    view.querySelector("#scan-test")!.addEventListener("click", () => receive(testPsbt));
    view.querySelector("#scan-cancel")!.addEventListener("click", () => finish(tr("QRの読み取りをやめました。", "QR scan was cancelled")));
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } }).then((media) => {
      stream = media;
      video.srcObject = media;
      void video.play();
      status.textContent = tr("QRを枠の中に合わせてください", "Fit the QR inside the frame");
      tick();
    }).catch(() => { status.textContent = tr("カメラを使えません。テスト用の取引で試せます。", "The camera is not available. Try the test transaction."); });
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

export async function webInvoke<T>(command: string): Promise<T> {
  await ready;
  switch (command) {
    case "state":
    case "set_network":
      return state() as T;
    case "parser_info":
      return call("parser_info") as T;
    case "demo_seed":
      call("load_mnemonic", new TextEncoder().encode(testMnemonic), new Uint8Array());
      return state() as T;
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
