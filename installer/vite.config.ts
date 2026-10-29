import { defineConfig } from "vite";

// Published next to the browser demo, at <pages>/lockdown/
export default defineConfig({
  base: "./",
  build: {
    outDir: "../dist-web/lockdown",
    emptyOutDir: true,
  },
});
