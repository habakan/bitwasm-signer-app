import appIcon from "../src-tauri/icons/source/app-icon.svg?url";
import { icon } from "./design/icons";
import { theme } from "./design/theme";
import { webApp, webDemo } from "./signer";
import type { Restriction, Screen, SignerState } from "./signer";
import { versions } from "./web/pwa";

export const moduleHashes = {
  parser: "9407abe3a65a56ebcfcab6da3b685f4e21ce9f6a60b3feddd299ddc0def89bab",
  signer: "d27fe4f8050193cc7101cf7fab26b0740a1b39e33c867ebc66cd05d9f9003508",
  checker: "7df36b4c3bfb2bec1826fb2a740e9f1ddd8281cb5530a878dc790ebfd7e63e37",
};

type View = { screen: Screen; signer: SignerState; busy: boolean };

// Japanese first, English for every other system language; the docs pick one with ?lang=
const language = new URLSearchParams(location.search).get("lang") ?? navigator.language;
export const lang = language.toLowerCase().startsWith("ja") ? "ja" : "en";
export const tr = (ja: string, en: string) => (lang === "ja" ? ja : en);

const androidKeyboardNotes = [
  tr("パスフレーズとシードフレーズの欄は、キーボードに学習しないよう求めますが、サードパーティ製キーボードは無視できます。Gboardなど、スマホに入っていたキーボードを使ってください。",
    "Passphrase and recovery word fields ask the keyboard not to learn, but third-party keyboards can ignore it. Use the keyboard that came with the phone, such as Gboard."),
  tr("Gboardでは、設定 › プライバシー › Gboardをカスタマイズ をオフにし、学習した単語とデータを削除します。",
    "In Gboard: Settings › Privacy › turn off Personalize Gboard, then Delete learned words and data."),
];
const iosKeyboardNotes = [
  tr("このアプリではサードパーティ製キーボードを使えません。標準のキーボードは、ここで入力した内容を学習しません。",
    "Third-party keyboards are blocked in this app, and the system keyboard does not learn what you type here."),
  tr("以前にほかのアプリでパスフレーズや単語を入力したことがある場合は、設定 › 一般 › 転送またはiPhoneをリセット › リセット › キーボードの変換学習をリセット を実行してください。",
    "If you typed a passphrase or seed words in another app before: Settings › General › Transfer or Reset iPhone › Reset › Reset Keyboard Dictionary."),
];
const androidAlwaysOn = tr("このアプリを開いている間は、スクリーンショットと画面共有を止め、ほかのアプリの重ね表示を隠します。",
  "Screenshots and screen sharing are blocked, and overlays from other apps are hidden while this app is open.");
const iosAlwaysOn = tr("画面の録画やミラーリング中は画面を隠し、サードパーティ製キーボードを止めます。",
  "The screen is covered while it is recorded or mirrored, and third-party keyboards are blocked.");
// Browser previews show both
const android = /Android/.test(navigator.userAgent);
const ios = /iPhone|iPad/.test(navigator.userAgent);
const keyboardNotes = android ? androidKeyboardNotes : ios ? iosKeyboardNotes : [...androidKeyboardNotes, ...iosKeyboardNotes];
const alwaysOnNotes = android ? [androidAlwaysOn] : ios ? [iosAlwaysOn] : [androidAlwaysOn, iosAlwaysOn];

const restrictionCopy: Record<string, [string, string]> = {
  network: [tr("ネットワーク", "Network"), tr("Wi-Fi、モバイルデータ、テザリング。インターネットにつながらないものも含みます。", "Wi-Fi, mobile data and tethering, also networks without internet.")],
  bluetooth: [tr("Bluetooth・NFC", "Bluetooth and NFC"), tr("NFCはAndroidのみ確認します。iOSでは、確認を始めるときにBluetoothの利用許可を求めます。", "NFC is checked on Android only. On iOS, checking it asks for Bluetooth access first.")],
  keyboard: [tr("サードパーティ製キーボード", "Third-party keyboard"), tr("パスフレーズはキーボードから入力します。", "Passphrases are typed on the keyboard.")],
  usb_debugging: [tr("USBデバッグ", "USB debugging"), tr("USBでつないだパソコンから、このスマホを操作できる状態です。", "A computer on the USB cable can control this phone.")],
  accessibility: [tr("ユーザー補助サービス", "Accessibility services"), tr("画面の内容を読み取れます。TalkBackなども含まれます。", "They can read the screen. Screen readers such as TalkBack are among them.")],
};
const levels = [["off", tr("オフ", "Off")], ["warn", tr("警告", "Warn")], ["require", tr("必須", "Require")]] as const;
const restrictionName = (r: Restriction) => restrictionCopy[r.id]?.[0] ?? r.id;
const activeRestrictions = (signer: SignerState) => (signer.restrictions ?? []).filter((r) => r.active);
export const restrictionBlocks = (signer: SignerState) => activeRestrictions(signer).some((r) => r.level === "require");

const disabledIf = (condition: boolean | undefined) => (condition ? "disabled" : "");

function button(id: string, label: string, variant: "primary" | "secondary" | "danger", opts: { icon?: string; disabled?: boolean } = {}) {
  return `<button class="button button-${variant}" id="${id}" ${disabledIf(opts.disabled)}>${opts.icon ? icon(opts.icon, 20) : ""}<span>${label}</span></button>`;
}

function tile(id: string, iconName: string, title: string, detail: string, disabled: boolean) {
  return `<button class="tile tile-wide" id="${id}" ${disabledIf(disabled)}>
    <span class="tile-icon">${icon(iconName)}</span>
    <span class="tile-copy"><span class="tile-title">${title}</span><span class="tile-detail">${detail}</span></span>
  </button>`;
}

function row(id: string, iconName: string, title: string, detail: string, opts: { value?: string; disabled?: boolean } = {}) {
  return `<button class="row" id="${id}" ${disabledIf(opts.disabled)}>${icon(iconName)}
    <span class="row-copy"><span class="row-title">${title}</span>${detail ? `<span class="row-detail">${detail}</span>` : ""}</span>
    ${opts.value ? `<span class="row-value">${opts.value}</span>` : ""}${icon("chevron", 20)}
  </button>`;
}

function segments(label: string, options: { id: string; label: string; selected: boolean; disabled?: boolean; danger?: boolean }[]) {
  return `<div class="segments segments-${options.length}" role="radiogroup" aria-label="${label}">${options.map((o) =>
    `<button class="segment${o.selected ? " selected" : ""}${o.selected && o.danger ? " danger" : ""}" id="${o.id}" role="radio" aria-checked="${o.selected}" ${disabledIf(o.disabled)}>${o.label}</button>`).join("")}</div>`;
}

const pill = (tone: string, text: string, iconName: string) => `<span class="pill pill-${tone}">${icon(iconName, 16)}<span>${text}</span></span>`;
const group = (label: string, body: string) => `<section class="group"><h2 class="overline">${label}</h2>${body}</section>`;
const question = (title: string, lead?: string) => `<div class="question"><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}</div>`;

function homeView({ signer, busy }: View) {
  if (webDemo) return {
    body: `${question("bitwasm-signer", tr("ブラウザ版では、公開されたテスト用の単語だけを使います。単語やSeedQRの入力はできません。", "The browser version only uses published test words. Typing words or scanning a SeedQR is turned off."))}
    ${group(tr("ウォレットを読み込む", "IMPORT WALLET"),
      tile("demo-seed", "words", tr("テスト用の鍵を使う", "Use the test key"), tr("abandon を11回と about・BIP39のテスト用の単語", "abandon ×11 + about · the BIP39 test words"), busy))}
    ${group(tr("新しいウォレット", "NEW WALLET"),
      tile("create-mnemonic", "plus", tr("新しいウォレットを作る(デモ)", "Create a new wallet (demo)"), tr("作った単語は本物の資金に使わないでください。", "Never use the words it makes for real funds."), busy))}`,
  };
  const saved = signer.saved ?? 0;
  const blocked = busy || restrictionBlocks(signer);
  return {
    body: `${question("bitwasm-signer", signer.storage
      ? tr("保存した鍵は暗号化され、開くには画面ロックが必要です。ウォレットを閉じるかアプリを離れると、メモリから消去されます。", "Saved keys are encrypted on this phone and need your screen lock to open. Closing the wallet or leaving the app wipes the key from memory.")
      : tr("鍵はこのスマホのメモリにだけあり、ウォレットを閉じるかアプリを離れると消去されます。", "Your key stays in this phone's memory and is wiped when you close the wallet or leave the app."))}
    ${saved ? group(tr("この端末に保存した鍵", "SAVED ON THIS DEVICE"),
      `<div class="card">${row("unlock-saved", "lock", tr("保存した鍵を開く", "Open a saved key"), tr(`${saved}件・画面ロックか生体認証`, `${saved} saved · screen lock or biometrics`), { disabled: blocked })}</div>`) : ""}
    ${group(tr("ウォレットを読み込む", "IMPORT WALLET"), `<div class="card">
      ${row("scan", "qr", tr("バックアップのQRを読み取る", "Scan your backup QR"), tr("SeedQR・CompactSeedQR", "SeedQR or CompactSeedQR"), { disabled: blocked })}
      ${row("import-mnemonic", "words", tr("シードフレーズを入力する", "Type your recovery words"), tr("12〜24個の単語", "12 to 24 words"), { disabled: blocked })}
    </div>`)}
    ${group(tr("新しいウォレット", "NEW WALLET"), `<div class="card">
      ${row("create-mnemonic", "plus", tr("新しいウォレットを作る", "Create a new wallet"), tr("安全な乱数かサイコロで作ります。", "From secure random or dice rolls."), { disabled: blocked })}
    </div>`)}`,
  };
}

function readyView({ signer, busy }: View) {
  const rows = [
    row("account", "key", tr("ウォレットアプリと接続する", "Connect your wallet app"), tr("公開鍵をQRで渡す", "Share public keys as a QR"), { disabled: busy }),
    row("find-address", "qr", tr("アドレスを確認する", "Check an address"), "", { disabled: busy }),
    row("advanced", "sliders", tr("高度な機能", "Advanced"), tr("マルチシグ、メッセージ署名など", "Multisig, message signing and more"), { disabled: busy }),
  ];
  return {
    body: `<div class="card"><div class="field">
      <span class="fingerprint"><span class="field-label">${tr("フィンガープリント", "Fingerprint")} · m/84h/${signer.testnet ? 1 : 0}h/0h</span><span class="data" id="fingerprint"></span></span>
      <span class="field-note">${tr("ウォレットアプリの表示と比べてください。", "Compare it with your wallet app.")}</span>
    </div></div>
    ${group(tr("そのほかの操作", "MORE"), `<div class="card">${rows.join("")}</div>`)}`,
    actions: `<div class="action-pair">${button("lock", tr("ウォレットを閉じる", "Close wallet"), "danger", { disabled: busy })}
      ${button("psbt", tr("取引に署名する", "Sign a transaction"), "primary", { icon: "signature", disabled: busy })}</div>`,
  };
}

// Tools most people never need, kept off the main screen
function advancedView({ signer, busy }: View) {
  const rows = [
    signer.multisig
      ? row("export-multisig", "shield", tr(`マルチシグ ${signer.multisig}をQRで渡す`, `Share multisig ${signer.multisig} as a QR`), "", { disabled: busy })
      : row("multisig", "shield", tr("マルチシグを登録する", "Register a multisig"), tr("コーディネーターの設定を読み取る", "Scan the setup from your coordinator"), { disabled: busy }),
    signer.multisig ? row("forget-multisig", "alert", tr("マルチシグの登録を解除する", "Forget the multisig"), "", { disabled: busy }) : "",
    row("sign-message", "signature", tr("メッセージに署名する", "Sign a message"), "", { value: "BIP137", disabled: busy }),
    row("bip85", "words", tr("子ニーモニックを作る", "Derive a child mnemonic"), "", { value: "BIP85", disabled: busy }),
  ];
  return {
    body: `<p class="lead">${tr("ふだんの送金と受け取りには使いません。必要なときだけ開いてください。", "Everyday sending and receiving does not need these. Open them only when you need one.")}</p>
    <div class="card">${rows.join("")}</div>`,
  };
}

function moduleField(name: string, hash: string, id = "") {
  return `<div class="field"><span class="field-label">${name}</span><code class="data hash"${id ? ` id="${id}"` : ""}>${hash}</code></div>`;
}

function settingsView({ signer, busy }: View) {
  const saved = signer.saved ?? 0;
  const active = activeRestrictions(signer);
  const networkNote = signer.loaded
    ? tr("切り替えるには、先にウォレットを閉じてください。", "Close the wallet before switching networks.")
    : tr("鍵を読み込む前に切り替えます。メインネットは本物のビットコインです。", "Switch before loading a key. Mainnet is real bitcoin.");
  const storageNote = webApp
    ? !signer.deviceSecure
      ? tr("このブラウザではパスキーを使えないため、鍵を保存できません。", "Passkeys are not available in this browser, so keys cannot be saved.")
      : signer.storage
        ? tr("読み込んだ鍵ごとに、保存するか選べます。単語かSeedQRだけを、このアプリのパスキーから導いた鍵で暗号化して保存し、開くたびにFace ID、指紋、または端末のパスコードを求めます。パスフレーズは毎回入力します。端末のパスコードを知る人は開けるので、推測されにくいパスコードにしてください。ブラウザのデータは消えることがあるので、紙のバックアップは必ず残してください。メモリのみに戻すと消去します。", "You choose whether to save each key you load. Only the words or the SeedQR are stored, encrypted with a key this app's passkey derives, and opening one asks for Face ID, a fingerprint or the device passcode. The passphrase is asked each time. Anyone who knows the device passcode can open them, so use one that is hard to guess. Browser data can be cleared, so always keep the paper backup. Switching to memory only erases them.")
        : tr("この端末には何も書き込みません。保存をオンにすると、このアプリのパスキーを作ります。iPhoneでは、AppleアカウントへのサインインとiCloudキーチェーンが必要で、パスキーは同じアカウントの端末に同期されます。サインアウトすると、保存した鍵を開けなくなります。", "Nothing is written to this device. Turning saving on creates a passkey for this app. On iPhone this needs an Apple Account and iCloud Keychain, and the passkey syncs to that account's devices. After signing out, saved keys cannot be opened.")
    : !signer.deviceSecure
    ? tr("鍵を保存するには、このスマホに画面ロックを設定してください。", "Set a screen lock on this phone to save keys.")
    : signer.storage
      ? tr("12個か24個の単語は、読み込んだ後に保存できます。単語だけを、画面ロックが必要な鍵で暗号化して保存します。パスフレーズは毎回入力します。メモリのみに戻すと消去します。", "12 and 24 word keys can be saved after loading. Only the words are stored, encrypted with a key that needs your screen lock; the passphrase is asked each time. Switching to memory only erases them.")
      : tr("この端末には何も書き込みません。鍵は、ウォレットを閉じるかアプリを離れるまでメモリにだけあります。", "Nothing is written to this phone. The key stays in memory until you close the wallet or leave the app.");
  return {
    body: `${group(tr("ネットワーク", "NETWORK"), `${segments(tr("ネットワーク", "Network"), [
        { id: "mainnet", label: tr("メインネット", "Mainnet"), selected: !signer.testnet, disabled: busy || signer.loaded || webDemo },
        { id: "signet", label: tr("テストネット", "Testnet"), selected: signer.testnet, disabled: busy || signer.loaded },
      ])}<p class="caption">${webDemo ? tr("ブラウザ版はテストネットだけです。", "The browser version is Testnet only.") : networkNote}</p>`)}
    ${webDemo || webApp ? "" : group(tr("安全", "SAFETY"), `<div class="card">${row("restrictions", "shield", tr("端末の機能制限", "Device restrictions"), tr("ネットワーク、Bluetooth、キーボード", "Network, Bluetooth, keyboard"),
        { value: active.length ? tr(`${active.length}件オン`, `${active.length} on`) : "", disabled: busy })}</div>`)}
    ${webDemo ? "" : `${group(tr("鍵の保存", "KEY STORAGE"), `${segments(tr("鍵の保存", "Key storage"), [
        { id: "storage-off", label: tr("メモリのみ", "Memory only"), selected: !signer.storage, disabled: busy },
        { id: "storage-on", label: tr("この端末に保存", "Save on this device"), selected: !!signer.storage, disabled: busy || !signer.deviceSecure },
      ])}<p class="caption">${storageNote}</p>
      ${saved ? button("erase-saved", tr(`保存した鍵${saved}件を消去する`, `Erase ${saved} saved key${saved === 1 ? "" : "s"}`), "danger", { disabled: busy }) : ""}`)}`}
    ${group(tr("表示", "DISPLAY"), segments(tr("テーマ", "Theme"), [
        { id: "theme-system", label: tr("端末に合わせる", "System"), selected: theme === "system" },
        { id: "theme-light", label: tr("ライト", "Light"), selected: theme === "light" },
        { id: "theme-dark", label: tr("ダーク", "Dark"), selected: theme === "dark" },
      ]))}
    ${group(tr("署名モジュール", "SIGNING MODULES"), `<div class="card">
      ${moduleField("parser.wasm", "", "parser-hash")}${moduleField("signer.wasm", moduleHashes.signer)}${moduleField("checker.wasm", moduleHashes.checker)}
    </div><p class="caption">${webDemo || webApp ? tr("起動時にSHA-256で検証し、このページの中のWasmiで動かします。", "Verified with SHA-256 at launch and run in Wasmi inside this page.") : tr("起動時にSHA-256で検証し、この端末のWasmiで動かします。", "Verified with SHA-256 at launch and run locally in Wasmi.")}</p>`)}
    ${webApp ? group(tr("このアプリの版", "THIS BUILD"), `<div class="card"><div class="field"><span class="field-label">${tr("実行中", "RUNNING")}</span><span class="data">${versions.current || "—"}</span>
      ${versions.next ? `<span class="field-note">${tr(`次に開いたときに ${versions.next} に切り替わります。`, `${versions.next} replaces it at the next launch.`)}</span>` : ""}</div></div>
      <p class="caption">${tr("ビルドしたファイルの一覧から決まる名前です。自分でビルドした dist-web/app/sw.js の CACHE と比べられます。", "Named from the list of built files. Compare it with CACHE in dist-web/app/sw.js from your own build.")}</p>`) : ""}
    <p class="about">bitwasm-signer 0.1 · ${tr("第三者の監査は受けていません", "Not audited by a third party")} · MIT</p>`,
  };
}

function restrictionsView({ signer, busy }: View) {
  const items = (signer.restrictions ?? []).map((r) => {
    const [name, note] = restrictionCopy[r.id] ?? [r.id, ""];
    const state = r.level === "off" ? pill("neutral", tr("確認しない", "Not checked"), "lock")
      : r.active ? pill(r.level === "require" ? "danger" : "warning", tr("オン", "On") + (r.detail ? ` · ${r.detail}` : ""), "alert")
      : pill("positive", tr("オフ", "Off"), "check");
    return `<section class="restriction">
      <div class="restriction-head"><h2 class="heading">${name}</h2>${state}</div>
      ${segments(name, levels.map(([level, label]) => ({ id: `level-${r.id}-${level}`, label, selected: r.level === level, disabled: busy, danger: level === "require" })))}
      <p class="caption">${note}</p>
    </section>`;
  }).join("");
  return {
    body: `<p class="lead">${tr("確認したい項目と、オンのときの動きを選びます。", "Choose what to check, and what happens while it is on.")}</p>
    <div class="levels-note caption">
      <p>${tr("警告: オンのときは画面上部に警告を出します。", "Warn: shows a warning at the top while it is on.")}</p>
      <p>${tr("必須: オンの間は鍵を読み込めず、読み込み済みの鍵は消去します。", "Require: while it is on, keys cannot be loaded and a loaded key is wiped.")}</p>
    </div>
    ${items}
    ${group(tr("キーボードのプライバシー", "KEYBOARD PRIVACY"), keyboardNotes.map((n) => `<p class="caption">${n}</p>`).join(""))}
    ${group(tr("常に有効", "ALWAYS ON"), alwaysOnNotes.map((n) => `<p class="caption">${n}</p>`).join(""))}`,
  };
}

const screens = { home: homeView, ready: readyView, advanced: advancedView, settings: settingsView, restrictions: restrictionsView };
const titles: Partial<Record<Screen, string>> = { advanced: tr("高度な機能", "Advanced"), settings: tr("設定", "Settings"), restrictions: tr("端末の機能制限", "Device restrictions") };

const notice = (tone: string, title: string, body: string) => `<div class="banner banner-${tone}" role="status">${icon("alert")}
  <div class="banner-copy"><strong>${title}</strong><span>${body}</span></div></div>`;

// The installed app only works offline once it runs from the home screen and its files are cached there
function installNotice() {
  if (!matchMedia("(display-mode: standalone)").matches) return notice("warning", tr("ホーム画面に追加して使います", "Add it to the home screen"),
    tr("ブラウザの共有メニューかメニューから「ホーム画面に追加」を選び、ホーム画面から開いてください。", "Choose Add to Home Screen in the browser's share menu or menu, then open it from the home screen."));
  if (!navigator.serviceWorker?.controller) return notice("info", tr("オフラインの準備をしています", "Getting ready for offline use"),
    tr("準備ができるまで、ネットにつないだまま開いておいてください。", "Keep it open and online until this goes away."));
  if (versions.next) return notice("warning", tr("新しい版が届いています", "A new build has arrived"),
    tr(`ネットにつながったときに届き、次に開いたときに ${versions.next} に切り替わります。`, `It came in while the phone was online, and replaces this one as ${versions.next} at the next launch.`));
  return "";
}

function banner(signer: SignerState) {
  if (webDemo) return notice("warning", tr("ブラウザ版のデモです", "This is the browser demo"), tr("ネットにつながった端末で動くため、本物の鍵やお金には使わないでください。", "It runs on a connected device, so never use it with a real key or real funds."));
  const install = webApp ? installNotice() : "";
  if (install) return install;
  const active = activeRestrictions(signer);
  if (!active.length) return "";
  const blocks = restrictionBlocks(signer);
  const title = active.length === 1
    ? tr(`${restrictionName(active[0])}がオンです`, `${restrictionName(active[0])} is on`)
    : tr(`オン: ${active.map(restrictionName).join("、")}`, `On: ${active.map(restrictionName).join(", ")}`);
  const body = webApp
    ? tr("機内モードにしてください。ネットにつながっている間は鍵を読み込めず、読み込んだ鍵は消去します。", "Turn on airplane mode. While online, keys cannot be loaded and a loaded key is wiped.")
    : blocks
    ? tr("必須に設定しているため、オフにするまで鍵を読み込めません。", "It is set to Require, so keys cannot be loaded until it is off.")
    : tr("使い終わったら、オフにしてください。", "Turn it off when you are done.");
  return `<div class="banner banner-${blocks ? "danger" : "warning"}" role="${blocks ? "alert" : "status"}">${icon("alert")}
    <div class="banner-copy"><strong>${title}</strong><span>${body}</span></div></div>`;
}

export function appView(view: View) {
  const { body, actions } = screens[view.screen](view) as { body: string; actions?: string };
  const title = titles[view.screen];
  const status = [
    view.signer.loaded ? pill("positive", tr("鍵を読み込み済み", "Key loaded"), "key") : pill("neutral", tr("鍵なし", "No key loaded"), "lock"),
    view.signer.testnet ? pill("neutral", tr("テストネット", "Testnet"), "check") : pill("accent", tr("メインネット", "Mainnet"), "key"),
  ].join("");
  return `<div class="app-shell" lang="${lang}">
    <header class="topbar">
      ${title ? `<button class="topbar-back" id="back" aria-label="${tr("戻る", "Back")}">${icon("back")}</button>
      <span class="topbar-title topbar-title-page">${title}</span>` : `<img class="topbar-icon" src="${appIcon}" alt="bitwasm-signer">`}
      <span class="topbar-status">${status}</span>
      ${view.screen === "home" || view.screen === "ready" ? `<button class="topbar-back topbar-end" id="settings" aria-label="${tr("設定", "Settings")}">${icon("settings")}</button>` : ""}
    </header>
    <div class="screen-banner">${banner(view.signer)}<div id="app-status" class="banner" role="status" aria-live="polite" hidden></div></div>
    <main class="screen-body">${body}</main>
    ${actions ? `<footer class="screen-actions">${actions}</footer>` : ""}
  </div>`;
}
