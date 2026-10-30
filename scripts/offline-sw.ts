import { createHash } from "node:crypto";
import type { Plugin } from "vite";

// Emits sw.js, which caches the whole build so the page starts with no network.
// Navigation tries the network first so an online visit gets the latest build.
export function offlineSw(name: string): Plugin {
  return {
    name: "offline-sw",
    apply: "build",
    generateBundle(_, bundle) {
      const files = ["./", "manifest.webmanifest", "icon.png", ...Object.keys(bundle)];
      const cache = createHash("sha256").update(files.join()).digest("hex").slice(0, 12);
      const source = `const CACHE = "${name}-${cache}";\nconst FILES = ${JSON.stringify(files)};\n`;
      this.emitFile({ type: "asset", fileName: "sw.js", source: source + SW });
    },
  };
}

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
