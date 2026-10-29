import { Adb, AdbDaemonTransport } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDevice, AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { PackageManager } from "@yume-chan/android-bin";

declare const __BUILD__: string;

const LOCKDOWN = "com.habakan.signer_lockdown";
const ADMIN = `${LOCKDOWN}/.AdminReceiver`;

// The browser's language first; the choice in the top bar is kept in this browser
const langKey = "lockdown-installer-lang";
let saved: string | null = null;
try { saved = localStorage.getItem(langKey); } catch {}
let lang = saved === "ja" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
const t = (ja: string, en: string) => (lang === "ja" ? ja : en);

const langButton = document.getElementById("lang")!;
const apkInput = document.getElementById("apk") as HTMLInputElement;
const hash = document.getElementById("hash")!;
const matches = document.getElementById("matches") as HTMLInputElement;
const sumsInput = document.getElementById("sums") as HTMLInputElement;
const verdict = document.getElementById("verdict")!;
const installButton = document.getElementById("install") as HTMLButtonElement;
const logArea = document.getElementById("log")!;
const done = document.getElementById("done")!;
const installed = document.getElementById("installed")!;

// "#apk" in the URL opens the plain install, which skips the device owner
let mode: "lockdown" | "apk" = location.hash === "#apk" ? "apk" : "lockdown";
function applyMode() {
  document.body.className = `app-mode-${mode}`;
  document.querySelectorAll<HTMLElement>("[data-set-mode]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.setMode === mode)));
  done.hidden = installed.hidden = true;
  logArea.textContent = "";
}
document.querySelectorAll<HTMLElement>("[data-set-mode]").forEach((b) =>
  b.addEventListener("click", () => {
    mode = b.dataset.setMode as typeof mode;
    history.replaceState(null, "", mode === "apk" ? "#apk" : location.pathname);
    applyMode();
  }),
);
applyMode();

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-ja]").forEach((el) => {
    el.dataset.en ??= el.innerHTML;
    el.innerHTML = lang === "ja" ? el.dataset.ja! : el.dataset.en;
  });
  langButton.textContent = lang === "ja" ? "English" : "日本語";
}
langButton.addEventListener("click", () => {
  lang = lang === "ja" ? "en" : "ja";
  try { localStorage.setItem(langKey, lang); } catch {}
  applyLang();
  verify();
});
applyLang();

// Same light and dark palettes as the signer app, following the system
const dark = matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => {
  document.documentElement.dataset.theme = dark.matches ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')!.setAttribute("content", dark.matches ? "#0d0f13" : "#ffffff");
};
dark.addEventListener("change", applyTheme);
applyTheme();

document.getElementById("build")!.textContent = __BUILD__;
// Installed as an app, the page opens on a PC that stays offline
if (import.meta.env.PROD && "serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");

const log = (line: string) => (logArea.textContent += line + "\n");

let apkHash = "";
let sums = "";

apkInput.addEventListener("change", async () => {
  apkHash = "";
  verify();
  const apk = apkInput.files?.[0];
  if (!apk) return;
  const digest = await crypto.subtle.digest("SHA-256", await apk.arrayBuffer());
  apkHash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  verify();
});

sumsInput.addEventListener("change", async () => {
  sums = (await sumsInput.files?.[0]?.text()) ?? "";
  verify();
});

// Looks the APK up by its hash, since a browser may rename a second download to "name (1).apk"
function verify() {
  hash.textContent = apkHash || "-";
  const entries = [...sums.matchAll(/^([0-9a-f]{64}) [ *](.+)$/gim)].map(([, h, name]) => ({ hash: h.toLowerCase(), name: name.trim() }));
  const hit = entries.find((e) => e.hash === apkHash);
  const show = (kind: string, text: string) => {
    verdict.className = `banner banner-${kind}`;
    verdict.textContent = text;
  };
  verdict.hidden = !apkHash || !sums;
  if (!apkHash) matches.checked = false;
  else if (!sums) {
    // The box is ticked by hand only when there is no SHA256SUMS to check against
    if (matches.disabled) matches.checked = false;
  } else if (hit) {
    matches.checked = true;
    show("positive", t(`SHA256SUMS の ${hit.name} と一致しました`, `Matches ${hit.name} in SHA256SUMS`));
  } else {
    matches.checked = false;
    if (entries.length === 0) show("warning", t("SHA256SUMS のファイルではないようです", "This does not look like a SHA256SUMS file"));
    else if (entries.some((e) => e.name === apkInput.files?.[0]?.name)) show("danger", t("SHA256SUMS の値と一致しません。このファイルは入れないでください", "Does not match SHA256SUMS. Do not install this file"));
    else show("warning", t("この SHA256SUMS には載っていません。同じリリースのファイルか確かめてください", "Not listed in this SHA256SUMS. Check that both files are from the same release"));
  }
  matches.disabled = !apkHash || !!sums;
  installButton.disabled = !matches.checked;
}

matches.addEventListener("change", () => (installButton.disabled = !matches.checked));

installButton.addEventListener("click", async () => {
  installButton.disabled = true;
  logArea.textContent = "";
  try {
    await install(apkInput.files![0]);
    (mode === "apk" ? installed : done).hidden = false;
  } catch (e) {
    log(
      e instanceof AdbDaemonWebUsbDevice.DeviceBusyError
        ? t("端末が使用中です。この PC の adb を止めて（adb kill-server）やり直してください", "The phone is busy. Stop adb on this PC (adb kill-server) and try again")
        : String(e),
    );
    installButton.disabled = false;
  }
});

async function install(apk: File) {
  const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
  if (!manager) throw new Error(t("このブラウザは WebUSB を使えません。Chrome か Edge で開いてください", "This browser has no WebUSB. Open the page in Chrome or Edge"));
  const device = await manager.requestDevice();
  if (!device) throw new Error(t("端末が選ばれませんでした", "No phone chosen"));

  log(t("端末で USB デバッグを許可してください", "Allow USB debugging on the phone"));
  // The key stays in this browser's IndexedDB, so the phone asks only once per browser
  const transport = await AdbDaemonTransport.authenticate({
    serial: device.serial,
    connection: await device.connect(),
    credentialStore: new AdbWebCredentialStore("bitwasm-signer lockdown installer"),
  });
  const adb = new Adb(transport);
  try {
    const shell = async (command: string) => (await adb.subprocess.noneProtocol.spawnWaitText(command)).trim();
    log(`${await shell("getprop ro.product.brand")} ${await shell("getprop ro.product.model")} / Android ${await shell("getprop ro.build.version.release")}`);

    if (mode === "apk") {
      log(t(`${apk.name} を入れています…`, `Installing ${apk.name}…`));
      await new PackageManager(adb).installStream(apk.size, apk.stream() as never);
      return log(t("入りました", "Installed"));
    }

    // Run again on a phone already set up, this only replaces Lockdown
    const owner = /Device Owner:[\s\S]*?package=(\S+)/.exec(await shell("dumpsys device_policy"))?.[1];
    const accounts = Number(/Accounts: (\d+)/.exec(await shell("dumpsys account"))?.[1] ?? 0);
    if (owner !== LOCKDOWN && accounts > 0) {
      throw new Error(t(`端末にアカウントが ${accounts} 件あります。設定 > アカウント からすべて削除してやり直してください`, `The phone has ${accounts} account(s). Remove them all in Settings > Accounts and try again`));
    }

    log(t("Lockdown を入れています…", "Installing Lockdown…"));
    // stream-extra types the browser's ReadableStream a little differently; the object is the same
    await new PackageManager(adb).installStream(apk.size, apk.stream() as never);

    if (owner === LOCKDOWN) return log(t("Lockdown はすでに Device Owner です", "Lockdown is already the device owner"));
    const result = await shell(`dpm set-device-owner ${ADMIN}`);
    log(result);
    if (!result.startsWith("Success")) throw new Error(t("Device Owner にできませんでした", "Could not set the device owner"));
  } finally {
    await adb.close();
  }
}
