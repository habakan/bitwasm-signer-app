import { createHash } from "node:crypto";
import type { Plugin } from "vite";

// Emits sw.js, which caches the whole build so the page starts with no network.
// `pinned` serves only from this build's cache and lets a new build in at the next launch;
// otherwise navigation tries the network first so an online visit gets the latest build.
export function offlineSw(name: string, pinned = false): Plugin {
  return {
    name: "offline-sw",
    apply: "build",
    generateBundle(_, bundle) {
      const files = ["./", "manifest.webmanifest", "icon.png", ...Object.keys(bundle)];
      const cache = createHash("sha256").update(files.join()).digest("hex").slice(0, 12);
      const source = `const NAME = "${name}-";\nconst CACHE = NAME + "${cache}";\nconst FILES = ${JSON.stringify(files)};\n`;
      this.emitFile({ type: "asset", fileName: "sw.js", source: source + (pinned ? PINNED : LATEST) + SHARED });
    },
  };
}

// Pages of one origin share Cache Storage, so each worker removes only its own older caches
const SHARED = `
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(NAME) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (e) => e.ports[0]?.postMessage(CACHE));
`;

const LATEST = `
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
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

const PINNED = `
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const request = e.request.mode === "navigate" ? "./" : e.request;
  e.respondWith(caches.open(CACHE).then((c) => c.match(request)).then((hit) => hit ?? fetch(e.request)));
});
`;
