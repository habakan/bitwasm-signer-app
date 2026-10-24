import { isPreview, signerInvoke } from "../signer";

export type Theme = "system" | "light" | "dark";

const dark = window.matchMedia("(prefers-color-scheme: dark)");
const key = "bitwasm-signer-theme";
// Storage can be unavailable in previews; the choice then lasts until the app closes
let saved: string | null = null;
try { saved = localStorage.getItem(key); } catch {}
export let theme: Theme = saved === "light" || saved === "dark" ? saved : "system";

function apply() {
  const resolved = theme === "system" ? (dark.matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0d0f13" : "#ffffff");
}

export function setTheme(next: Theme) {
  theme = next;
  try { localStorage.setItem(key, next); } catch {}
  apply();
  tellNative();
}

// The native review and scanner screens follow the same choice
function tellNative() {
  if (!isPreview) void signerInvoke("set_theme", { theme }).catch(() => undefined);
}

dark.addEventListener("change", apply);
apply();
tellNative();
