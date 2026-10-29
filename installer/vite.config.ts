import { createHash } from "node:crypto";
import { defineConfig } from "vite";

const build = process.env.GITHUB_SHA?.slice(0, 7) ?? "local";

// Published next to the browser demo, at <pages>/lockdown/
export default defineConfig({
  base: "./",
  define: { __BUILD__: JSON.stringify(build) },
  build: {
    outDir: "../dist-web/lockdown",
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "offline-sw",
      apply: "build",
      generateBundle(_, bundle) {
        const files = ["./", "manifest.webmanifest", "icon.png", ...Object.keys(bundle)];
        const cache = createHash("sha256").update(files.join()).digest("hex").slice(0, 12);
        const source = `const CACHE = "lockdown-${cache}";\nconst FILES = ${JSON.stringify(files)};\n`;
        this.emitFile({ type: "asset", fileName: "sw.js", source: source + SW });
      },
    },
  ],
});

// The page fetches nothing at run time, so caching the build makes it work offline.
// Navigation tries the network first so an online visit gets the latest build.
const SW = `
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    e.request.mode === "navigate"
      ? fetch(e.request).catch(() => caches.match("./"))
      : caches.match(e.request).then((hit) => hit ?? fetch(e.request)),
  );
});
`;
