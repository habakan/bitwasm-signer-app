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
const installButton = document.getElementById("install") as HTMLButtonElement;
const logArea = document.getElementById("log")!;
const done = document.getElementById("done")!;

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

apkInput.addEventListener("change", async () => {
  matches.checked = false;
  installButton.disabled = true;
  const apk = apkInput.files?.[0];
  if (!apk) return;
  const digest = await crypto.subtle.digest("SHA-256", await apk.arrayBuffer());
  hash.textContent = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  matches.disabled = false;
});

matches.addEventListener("change", () => (installButton.disabled = !matches.checked));

installButton.addEventListener("click", async () => {
  installButton.disabled = true;
  logArea.textContent = "";
  try {
    await install(apkInput.files![0]);
    done.hidden = false;
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
