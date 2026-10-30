import { defineConfig } from "vite";
import { offlineSw } from "./scripts/offline-sw";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  // `--mode pwa` builds the installable signer, published at <pages>/app/
  publicDir: mode === "pwa" ? "web/pwa" : "public",
  plugins: mode === "pwa" ? [offlineSw("signer", true), {
    name: "pwa-head",
    // The page fetches only its own files, so nothing it reads can be sent elsewhere unless the page itself is replaced
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" as const },
      { tag: "link", attrs: { rel: "manifest", href: "./manifest.webmanifest" }, injectTo: "head" as const },
      { tag: "link", attrs: { rel: "apple-touch-icon", href: "./icon.png" }, injectTo: "head" as const },
    ],
  }] : [],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
