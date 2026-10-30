<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useData, withBase } from "vitepress";

// The browser demo is published one level above the docs; `pnpm dev:docs` uses the live one
const { lang, isDark, frontmatter } = useData();
const home = import.meta.env.DEV ? "https://habakan.github.io/bitwasm-signer-app/" : withBase("/../");
const src = `${home}?lang=${lang.value}`;
const key = ref(0);
const ja = lang.value === "ja";

// A 390×844 screen plus the 10px bezel, scaled as a whole so the phone keeps its shape and text size ratio
const [width, height] = [410, 864];
const figure = useTemplateRef<HTMLElement>("figure");
const scale = ref(0.8);
const fit = () => {
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vp-nav-height")) || 64;
  const room = figure.value?.parentElement?.clientWidth ?? width;
  scale.value = Math.min(1, (innerHeight - nav - 120) / height, room / width);
};

// `demo:` in the frontmatter maps section ids to the taps that reach their screen
let section = "";
let taps: string[] = [];
const sync = () => {
  if (!figure.value?.closest(".aside")) return;
  const scenes = frontmatter.value.demo ?? {};
  // A section counts once its heading nears the top; at the page end the last visible one wins
  const end = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
  let id = "";
  for (const heading of document.querySelectorAll<HTMLElement>(".vp-doc h2[id]"))
    if (Array.isArray(scenes[heading.id]) && heading.getBoundingClientRect().top < (end ? innerHeight : 200)) id = heading.id;
  if (id === section) return;
  section = id;
  taps = id ? scenes[id] : [];
  key.value++;
};
const play = async () => {
  const run = key.value;
  for (const selector of taps) {
    let target: HTMLButtonElement | null | undefined;
    // The engine loads after the page, so buttons appear or stay disabled for a moment
    for (let i = 0; i < 100 && !(target = frame.value?.contentDocument?.querySelector<HTMLButtonElement>(`${selector}:not(:disabled)`)); i++)
      await new Promise((r) => setTimeout(r, 50));
    if (run !== key.value || !target) return;
    target.click();
    await new Promise((r) => setTimeout(r, 300));
  }
};

onMounted(() => { fit(); sync(); addEventListener("resize", fit); addEventListener("scroll", sync, { passive: true }); });
onBeforeUnmount(() => { removeEventListener("resize", fit); removeEventListener("scroll", sync); });

// Same origin, so the docs' light/dark switch is copied into the app without reloading it
const frame = useTemplateRef<HTMLIFrameElement>("frame");
const follow = () => {
  const root = frame.value?.contentDocument?.documentElement;
  if (root) root.dataset.theme = isDark.value ? "dark" : "light";
};
watch(isDark, follow);
</script>

<template>
  <figure ref="figure" class="demo" :style="{ width: `${width * scale}px` }">
    <div :style="{ height: `${height * scale}px` }">
      <iframe ref="frame" :key="key" :src="src" :title="ja ? 'ブラウザ版のデモ' : 'Browser demo'" allow="camera" @load="follow(); play()" :style="{ transform: `scale(${scale})` }"></iframe>
    </div>
    <figcaption>
      <button type="button" @click="key++">{{ ja ? "この画面に戻す" : "Reset this screen" }}</button>
      <a :href="src" target="_blank" rel="noopener">{{ ja ? "別のタブで開く" : "Open in a new tab" }}</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.demo { margin: 0 auto 24px; }
.demo iframe { display: block; box-sizing: border-box; width: 410px; height: 864px; border: 10px solid #16191c; border-radius: 52px; background: #fff; transform-origin: 0 0; }
.demo figcaption { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; }
.demo :is(button, a) { color: var(--vp-c-brand-1); }
:global(.aside) .demo { margin: 0; }
:global(.VPDoc:has(.demo) .aside) { max-width: 442px; }
:global(.VPDoc:has(.demo) :is(.aside-container, .aside-curtain)) { width: 410px; }
</style>
