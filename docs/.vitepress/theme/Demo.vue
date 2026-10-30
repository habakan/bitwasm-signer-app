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
  scale.value = Math.min(1, (innerHeight - nav - 190) / height, room / width);
};

// `demo:` maps section ids to steps on a fresh demo: "#id" taps every match, "scroll:<selector>" scrolls it
// to the end and "type:<selector>=<text>" fills it in
let section = "";
let taps: string[] = [];
const sync = () => {
  if (following.value || !figure.value?.closest(".aside")) return;
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
    if (run !== key.value || !targets.length) return;
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

// The other way round: tapping in the demo scrolls to the section whose scene ends with that button
const following = ref(false);
let tapped: string[] = [];
const onTap = (event: Event) => {
  const id = (event.target as Element).closest?.("button[id]")?.id;
  if (!following.value || !id) return;
  tapped = [...tapped, `#${id}`].slice(-20);
  // Of the scenes ending with this button, the one sharing the longest run of recent taps
  const scenes: Record<string, string[]> = frontmatter.value.demo ?? {};
  const shared = (steps: string[]) => { let n = 0; while (n < steps.length && steps.at(-1 - n) === tapped.at(-1 - n)) n++; return n; };
  const ids = (name: string) => scenes[name].filter((step) => step.startsWith("#"));
  const match = Object.keys(scenes).filter((name) => ids(name).at(-1) === `#${id}`).sort((a, b) => shared(ids(b)) - shared(ids(a)))[0];
  const heading = match && document.getElementById(match);
  if (!heading) return;
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vp-nav-height")) || 64;
  scrollTo({ top: heading.getBoundingClientRect().top + scrollY - nav - 24, behavior: "smooth" });
};
const loaded = (event: Event, k: number) => {
  if (k !== key.value) return;
  frame = event.target as HTMLIFrameElement;
  applyTheme();
  frames.value = [frames.value.at(-1)!];
  frame.contentDocument?.addEventListener("click", onTap, true);
  void play();
};
// Leaving the mode puts the phone back on the section in view
watch(following, (on) => {
  if (on) return;
  section = "-";
  sync();
});
const reset = () => {
  if (following.value) { taps = []; tapped = []; }
  key.value++;
};
</script>

<template>
  <figure ref="figure" class="demo" :style="{ width: `${width * scale}px` }">
    <div class="modes" role="group" :aria-label="ja ? 'デモの使い方' : 'Demo mode'">
      <button type="button" :aria-pressed="!following" @click="following = false">{{ ja ? "スクロールで見る" : "Watch as you scroll" }}</button>
      <button type="button" :aria-pressed="following" @click="following = true">{{ ja ? "自分で触る" : "Try it yourself" }}</button>
    </div>
    <div class="screen" :style="{ height: `${height * scale}px` }">
      <iframe v-for="f in frames" :key="f.key" :src="f.src" :class="{ loading: f !== frames[0] }" :title="ja ? 'ブラウザ版のデモ' : 'Browser demo'" allow="camera" @load="loaded($event, f.key)" :style="{ transform: `scale(${scale})` }"></iframe>
    </div>
    <figcaption>
      <button type="button" @click="reset">{{ following ? (ja ? "最初からやり直す" : "Start over") : (ja ? "この画面に戻す" : "Reset this screen") }}</button>
      <a :href="src" target="_blank" rel="noopener">{{ ja ? "別のタブで開く" : "Open in a new tab" }}</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.demo { margin: 0 auto 24px; }
.demo .screen { position: relative; }
.demo iframe { position: absolute; top: 0; left: 0; box-sizing: border-box; width: 410px; height: 864px; border: 10px solid #16191c; border-radius: 52px; background: #fff; transform-origin: 0 0; }
.demo iframe.loading { opacity: 0; pointer-events: none; }
.demo .modes { display: flex; margin-bottom: 12px; padding: 3px; border-radius: 999px; background: var(--vp-c-default-soft); }
.demo .modes button { flex: 1; padding: 6px 0; border-radius: 999px; color: var(--vp-c-text-2); font-size: 14px; font-weight: 600; }
.demo .modes button[aria-pressed="true"] { background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.demo figcaption { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; }
.demo figcaption :is(button, a) { color: var(--vp-c-brand-1); }
:global(.aside) .demo { margin: 0; }
:global(.VPDoc:has(.demo) .aside) { max-width: 442px; }
:global(.VPDoc:has(.demo) :is(.aside-container, .aside-curtain)) { width: 410px; }
</style>
