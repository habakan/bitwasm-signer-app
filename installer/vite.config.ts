import { defineConfig } from "vite";
import { offlineSw } from "../scripts/offline-sw";

const build = process.env.GITHUB_SHA?.slice(0, 7) ?? "local";

// Published next to the browser demo, at <pages>/install/
export default defineConfig({
  base: "./",
  define: { __BUILD__: JSON.stringify(build) },
  build: {
    outDir: "../dist-web/install",
    emptyOutDir: true,
  },
  plugins: [offlineSw("lockdown")],
});
