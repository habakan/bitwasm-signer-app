import "./styles.css";
import { initialState, interactivePreview, isPreview, previewScreen, signerInvoke, webApp, webDemo } from "./signer";
import type { Screen, SignedPsbtResult, SignerState } from "./signer";
import { setTheme } from "./design/theme";
import { appView, moduleHashes, restrictionBlocks, tr } from "./views";
import { startPwa } from "./web/pwa";

type StatusKind = "info" | "error" | "loading";

const root = document.querySelector<HTMLDivElement>("#app")!;
// The browser demo sits in a phone frame on wide screens; its full-screen steps open inside the frame
if (webDemo) {
  const phone = document.createElement("div");
  phone.className = "phone";
  root.before(phone);
  phone.append(root);
  document.documentElement.classList.add("web-demo");
}
if (webApp) void startPwa(() => render());
let screen: Screen = previewScreen ?? "home";
let signerState: SignerState = initialState;
let statusMessage = "";
let statusKind: StatusKind = "info";
let busy = false;
let signerActionStarted = false;
let parserHash = "";

function render() {
  root.innerHTML = appView({ screen, signer: signerState, busy });
  const status = root.querySelector<HTMLElement>("#app-status")!;
  status.textContent = statusMessage;
  status.className = `banner banner-${statusKind}`;
  status.hidden = statusMessage.length === 0;
  const fingerprint = root.querySelector<HTMLElement>("#fingerprint");
  if (fingerprint) fingerprint.textContent = signerState.fingerprint?.match(/.{1,4}/g)?.join(" ") ?? "—";
  const parser = root.querySelector<HTMLElement>("#parser-hash");
  if (parser) parser.textContent = parserHash || moduleHashes.parser;
}

function setStatus(message: string, kind: StatusKind = "info") {
  statusMessage = message;
  statusKind = kind;
  render();
}

function call<T>(command: string, args?: Record<string, unknown>) {
  return signerInvoke<T>(command, args, signerState);
}

// Shows the loading message, runs the task, then shows the message it returns or the error
async function runAction(loading: string, task: () => Promise<string>) {
  signerActionStarted = true;
  busy = true;
  setStatus(loading, "loading");
  try {
    statusMessage = await task();
    statusKind = "info";
  } catch (error) {
    statusMessage = String(error);
    statusKind = "error";
  }
  busy = false;
  render();
}

function setNetwork(testnet: boolean) {
  return runAction(tr("ネットワークを切り替えています…", "Changing network…"), async () => {
    signerState = await call<SignerState>("set_network", { testnet });
    return testnet ? tr("テストネットに切り替えました。", "Switched to Testnet.") : tr("メインネットに切り替えました。", "Switched to Mainnet.");
  });
}

const loadingSeed = {
  scan_seed_qr: tr("バックアップのQRを読み取っています。鍵はこのスマホから出ません。", "Scanning your backup QR. The key stays on this phone."),
  import_mnemonic: tr("シードフレーズを入力してください。鍵はこのスマホから出ません。", "Type your recovery words. The key stays on this phone."),
  demo_seed: tr("テスト用の鍵を読み込んでいます…", "Loading the test key…"),
  unlock_saved: tr("保存した鍵を選び、画面ロックで確認してください。", "Choose a saved key and confirm with your screen lock."),
};

function loadSeed(command: keyof typeof loadingSeed) {
  return runAction(loadingSeed[command], async () => {
    signerState = await call<SignerState>(command);
    screen = "ready";
    return tr("鍵を読み込みました。鍵はメモリにだけあります。", "Key loaded. It stays in memory only.");
  });
}

function setStorage(enabled: boolean) {
  return runAction(tr("鍵の保存を変更しています…", "Updating key storage…"), async () => {
    signerState = await call<SignerState>("set_storage", { enabled });
    return signerState.storage ? tr("鍵をこの端末に保存します。", "Keys will be saved on this phone.") : tr("鍵はメモリにだけ置きます。", "Keys stay in memory only.");
  });
}

function setRestriction(id: string, level: string) {
  return runAction(tr("端末の機能制限を変更しています…", "Updating device restrictions…"), async () => {
    signerState = await call<SignerState>("set_restriction", { id, level });
    return tr("端末の機能制限を変更しました。", "Device restrictions updated.");
  });
}

function eraseSaved() {
  return runAction(tr("保存した鍵を消去しています…", "Erasing saved keys…"), async () => {
    signerState = await call<SignerState>("erase_saved");
    return tr("保存した鍵を消去しました。", "Saved keys erased.");
  });
}

function signPsbt() {
  return runAction(tr("ウォレットアプリの取引のQRを読み取ってください。", "Scan the transaction QR from your wallet app."), async () => {
    const result = await call<SignedPsbtResult>("scan_psbt");
    signerState = { ...signerState, ...result };
    screen = signerState.loaded ? "ready" : "home";
    return result.shown ? tr("署名しました。", "Signed.") : tr("署名しましたが、QRの受け渡しが終わっていません。", "Signed, but the QR handoff did not finish.");
  });
}

function exportAccount() {
  return runAction(tr("公開鍵を用意しています…", "Preparing public keys…"), async () => {
    await call("export_account");
    return tr("公開鍵のQRを表示しました。", "Showed the public key QR.");
  });
}

const multisigMessages = {
  register_multisig: [tr("コーディネーターのマルチシグ設定を読み取ってください。", "Scan the multisig setup from your coordinator."), () => tr(`マルチシグ ${signerState.multisig} を登録しました。おつりを見分けられます。`, `Multisig ${signerState.multisig} registered. Its change is now recognised.`)],
  export_multisig: [tr("マルチシグの設定を用意しています…", "Preparing the multisig setup…"), () => tr("マルチシグの設定のQRを表示しました。", "Showed the multisig setup QR.")],
  forget_multisig: [tr("マルチシグの登録を解除しています…", "Forgetting the multisig…"), () => tr("マルチシグの登録を解除しました。", "The multisig was forgotten.")],
} as const;

function multisig(command: keyof typeof multisigMessages) {
  const [loading, done] = multisigMessages[command];
  return runAction(loading, async () => {
    signerState = { ...signerState, ...(await call<SignerState>(command)) };
    return done();
  });
}

function runNativeTool(command: string, label: string) {
  return runAction(tr(`${label}…`, `${label} on this device…`), async () => {
    const result = await call<Partial<SignerState>>(command);
    // A mnemonic that passed its backup check may have been loaded as the signing key
    if (result?.loaded && result.fingerprint) {
      signerState = { ...signerState, ...result } as SignerState;
      screen = "ready";
    }
    return tr(`${label}: 完了しました。`, `${label} finished.`);
  });
}

function lockSigner() {
  return runAction(tr("鍵を消去しています…", "Wiping the key…"), async () => {
    await call("lock");
    signerState = { ...signerState, loaded: false, fingerprint: null };
    screen = "home";
    return tr("鍵を消去しました。", "Key wiped.");
  });
}

function leaveScreen() {
  screen = screen === "restrictions" ? "settings" : signerState.loaded ? "ready" : "home";
  statusMessage = "";
  render();
}

// Each sub-screen adds a history entry, so Android's back button returns here instead of closing the app
function openScreen(next: Screen) {
  screen = next;
  history.pushState({ sub: true }, "");
  render();
}

function goBack() {
  if (history.state?.sub) history.back();
  else leaveScreen();
}
window.addEventListener("popstate", leaveScreen);

// Keyed by button id
const actions: Record<string, () => void> = {
  "back": goBack,
  "settings": () => openScreen("settings"),
  "advanced": () => openScreen("advanced"),
  "restrictions": () => openScreen("restrictions"),
  "theme-system": () => { setTheme("system"); render(); },
  "theme-light": () => { setTheme("light"); render(); },
  "theme-dark": () => { setTheme("dark"); render(); },
  "mainnet": () => setNetwork(false),
  "signet": () => setNetwork(true),
  "storage-off": () => setStorage(false),
  "storage-on": () => setStorage(true),
  "erase-saved": eraseSaved,
  "unlock-saved": () => loadSeed("unlock_saved"),
  "scan": () => loadSeed("scan_seed_qr"),
  "demo-seed": () => loadSeed("demo_seed"),
  "import-mnemonic": () => loadSeed("import_mnemonic"),
  "create-mnemonic": () => runNativeTool("create_mnemonic", tr("新しいウォレットを作る", "Create a new wallet")),
  "psbt": signPsbt,
  "account": exportAccount,
  "multisig": () => multisig("register_multisig"),
  "export-multisig": () => multisig("export_multisig"),
  "forget-multisig": () => multisig("forget_multisig"),
  "bip85": () => runNativeTool("bip85_mnemonic", tr("子ニーモニックを作る", "Derive a child mnemonic")),
  "find-address": () => runNativeTool("find_address", tr("アドレスを確認する", "Check an address")),
  "sign-message": () => runNativeTool("sign_message", tr("メッセージに署名する", "Sign a message")),
  "lock": lockSigner,
};

if (!previewScreen || interactivePreview) {
  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest("button");
    if (!button || button.disabled) return;
    const level = /^level-(\w+)-(off|warn|require)$/.exec(button.id);
    if (level) void setRestriction(level[1], level[2]);
    else actions[button.id]?.();
  });
}

render();

if (!isPreview) {
  // The native side wipes the key when the app leaves the screen or a required restriction comes on
  const refresh = () => {
    if (document.visibilityState !== "visible" || busy) return;
    void call<SignerState>("state").then((state) => {
      const wiped = signerState.loaded && !state.loaded;
      const changed = wiped || JSON.stringify(state.restrictions) !== JSON.stringify(signerState.restrictions);
      signerState = state;
      if (wiped) {
        if (screen === "ready" || screen === "advanced") screen = "home";
        setStatus(webApp && restrictionBlocks(state)
          ? tr("ネットにつながったため、鍵を消去しました。", "The key was wiped because the device went online.")
          : restrictionBlocks(state)
          ? tr("必須に設定した項目がオンになったため、鍵を消去しました。", "The key was wiped because a required restriction came on.")
          : tr("アプリを離れたため、鍵を消去しました。", "The key was wiped when you left the app."));
      } else if (changed) {
        render();
      }
    }).catch(() => undefined);
  };
  document.addEventListener("visibilitychange", refresh);
  setInterval(refresh, 2000);

  void call<SignerState>("state").then((state) => {
    if (signerActionStarted) return;
    signerState = state;
    if (state.loaded) screen = "ready";
    render();
  }).catch(() => undefined);

  void call<{ hash: string }>("parser_info").then(({ hash }) => {
    parserHash = hash;
    render();
  }).catch(() => undefined);
}
