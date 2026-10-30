<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useData, withBase } from "vitepress";

// The browser demo is published one level above the docs; `pnpm dev:docs` uses the live one
const { lang, isDark, frontmatter } = useData();
const home = import.meta.env.DEV ? "https://habakan.github.io/bitwasm-signer-app/" : withBase("/../");
// Switching the docs' language does not reload the page, so the demo follows it here
const src = computed(() => `${home}?lang=${lang.value}`);
const key = ref(0);
// A new scene loads behind the one on screen and replaces it once loaded, so the phone never goes blank
const frames = ref([{ key: 0, src: src.value }]);
watch(key, (k) => { frames.value = [frames.value[0], { key: k, src: src.value }]; });
let frame: HTMLIFrameElement | undefined;
const ja = computed(() => lang.value === "ja");
watch(lang, () => { section = "-"; void nextTick(sync); });

// A 390×844 screen plus the 10px bezel, scaled as a whole so the phone keeps its shape and text size ratio
const [width, height] = [410, 864];
const figure = useTemplateRef<HTMLElement>("figure");
const scale = ref(0.8);
const fit = () => {
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vp-nav-height")) || 64;
  const room = figure.value?.parentElement?.clientWidth ?? width;
  scale.value = Math.min(1, (innerHeight - nav - 140) / height, room / width);
};

// `demo:` maps section ids to steps on a fresh demo: "#id" taps every match, "scroll:<selector>" scrolls it
// to the end and "type:<selector>=<text>" fills it in
let section = "";
let taps: string[] = [];
const sync = () => {
  if (!figure.value?.closest(".aside")) return;
  const scenes = frontmatter.value.demo ?? {};
  // A section counts once its heading nears the top; at the page end the last visible one wins
  const end = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
  let id = "";
  for (const heading of document.querySelectorAll<HTMLElement>(".vp-doc :is(h2, h3)[id]"))
    if (scenes[heading.id] && heading.getBoundingClientRect().top < (end ? innerHeight : 140)) id = heading.id;
  if (id === section) return;
  section = id;
  taps = id ? scenes[id] : [];
  key.value++;
};
const play = async () => {
  const run = key.value;
  for (const step of taps) {
    const [action, arg] = /^(scroll|type):(.*)$/.exec(step)?.slice(1) ?? ["tap", step];
    const [selector, text] = action === "type" ? arg.split("=") : [action === "tap" ? `${arg}:not(:disabled)` : arg];
    let targets: HTMLElement[] = [];
    // The engine loads after the page, so buttons appear or stay disabled for a moment
    for (let i = 0; i < 100 && !(targets = [...(frame?.contentDocument?.querySelectorAll<HTMLElement>(selector) ?? [])]).length; i++)
      await new Promise((r) => setTimeout(r, 50));
    if (run !== key.value || touched || !targets.length) return;
    for (const target of targets) {
      if (action === "scroll") { target.scrollTop = target.scrollHeight; target.dispatchEvent(new Event("scroll")); }
      else if (action === "type") { (target as HTMLInputElement).value = text; target.dispatchEvent(new Event("input")); }
      else target.click();
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
};

onMounted(() => { fit(); sync(); addEventListener("resize", fit); addEventListener("scroll", sync, { passive: true }); });
onBeforeUnmount(() => { removeEventListener("resize", fit); removeEventListener("scroll", sync); });

// Same origin, so the docs' light/dark switch is copied into the app without reloading it
const applyTheme = () => {
  const root = frame?.contentDocument?.documentElement;
  if (root) root.dataset.theme = isDark.value ? "dark" : "light";
};
watch(isDark, applyTheme);

// Touching the phone stops the scene's playback; the next section's scene replaces what was done
let touched = false;
const loaded = (event: Event, k: number) => {
  if (k !== key.value) return;
  frame = event.target as HTMLIFrameElement;
  applyTheme();
  frames.value = [frames.value.at(-1)!];
  touched = false;
  frame.contentDocument?.addEventListener("pointerdown", () => { touched = true; }, true);
  void play();
};
const reset = () => { key.value++; };
</script>

<template>
  <figure ref="figure" class="demo" :style="{ width: `${width * scale}px` }">
    <div class="screen" :style="{ height: `${height * scale}px` }">
      <iframe v-for="f in frames" :key="f.key" :src="f.src" :class="{ loading: f !== frames[0] }" :title="ja ? 'ブラウザ版のデモ' : 'Browser demo'" allow="camera" @load="loaded($event, f.key)" :style="{ transform: `scale(${scale})` }"></iframe>
    </div>
    <figcaption>
      <button type="button" @click="reset">{{ ja ? "この画面に戻す" : "Reset this screen" }}</button>
      <a :href="src" target="_blank" rel="noopener">{{ ja ? "別のタブで開く" : "Open in a new tab" }}</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.demo { margin: 0 auto 24px; }
.demo .screen { position: relative; }
.demo iframe { position: absolute; top: 0; left: 0; box-sizing: border-box; width: 410px; height: 864px; border: 10px solid #16191c; border-radius: 52px; box-shadow: 0 0 0 1px var(--line); background: #fff; transform-origin: 0 0; }
.demo iframe.loading { opacity: 0; pointer-events: none; }
.demo figcaption { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; }
.demo figcaption :is(button, a) { color: var(--vp-c-brand-1); }
:global(.aside) .demo { margin: 0; }
:global(.VPDoc:has(.demo) .aside) { max-width: 442px; }
:global(.VPDoc:has(.demo) :is(.aside-container, .aside-curtain)) { width: 410px; }
</style>
