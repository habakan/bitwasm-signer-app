import { invoke } from "@tauri-apps/api/core";

export type SignerState = {
  loaded: boolean;
  fingerprint: string | null;
  testnet: boolean;
  storage?: boolean;
  deviceSecure?: boolean;
  saved?: number;
  multisig?: string;
  restrictions?: Restriction[];
};
// A device feature such as a network; "require" stops seeds from loading while it is on
export type Restriction = { id: string; level: "off" | "warn" | "require"; active: boolean; detail: string };
export type SignedPsbtResult = SignerState & { signed: boolean; shown: boolean };
export type Screen = "home" | "ready" | "advanced" | "settings" | "restrictions";

// ?ui-preview=home|ready|settings|restrictions renders a static screen; ?ui-preview=interactive fakes the plugin
const previewParam = new URLSearchParams(window.location.search).get("ui-preview");
export const interactivePreview = previewParam === "interactive";
export const previewScreen: Screen | null =
  previewParam === "home" || previewParam === "ready" || previewParam === "settings" || previewParam === "restrictions" ? previewParam : null;
export const isPreview = previewScreen !== null || interactivePreview;
// `vite --mode web` builds the browser demo: the engine runs in the page with test keys only
export const webDemo = import.meta.env.MODE === "web";
// `vite --mode pwa` builds the installable signer: the same engine with real keys, used offline only
export const webApp = import.meta.env.MODE === "pwa";

export const initialState: SignerState = {
  loaded: previewScreen === "ready",
  fingerprint: previewScreen === "ready" ? "73c5da0a" : null,
  testnet: isPreview || webDemo,
  storage: false,
  deviceSecure: false,
  restrictions: isPreview ? [
    { id: "network", level: "warn", active: false, detail: "" },
    { id: "bluetooth", level: "off", active: false, detail: "" },
    { id: "keyboard", level: "warn", active: false, detail: "" },
    { id: "usb_debugging", level: "warn", active: true, detail: "" },
    { id: "accessibility", level: "warn", active: false, detail: "" },
  ] : [],
};

export async function signerInvoke<T>(command: string, args?: Record<string, unknown>, current = initialState): Promise<T> {
  if (webDemo || webApp) return (await import("./web/demo")).webInvoke<T>(command, args);
  if (!interactivePreview) return invoke<T>(`plugin:signer|${command}`, args);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const demo: SignerState = { ...current, loaded: true, fingerprint: "73c5da0a", testnet: true };
  switch (command) {
    case "scan_seed_qr":
    case "import_mnemonic":
    case "unlock_saved":
      return demo as T;
    case "scan_psbt":
      return { ...demo, signed: true, shown: true } as T;
    case "set_network":
      return { ...current, testnet: args?.testnet === true } as T;
    case "set_storage":
      return { ...current, storage: args?.enabled === true } as T;
    case "set_restriction":
      return { ...current, restrictions: current.restrictions?.map((r) => (r.id === args?.id ? { ...r, level: args.level } : r)) } as T;
    case "erase_saved":
      return { ...current, saved: 0 } as T;
    case "register_multisig":
      return { ...current, multisig: "2-of-3" } as T;
    case "forget_multisig":
      return { ...current, multisig: undefined } as T;
    case "lock":
      return undefined as T;
    default:
      return current as T;
  }
}
