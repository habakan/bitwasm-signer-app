<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { useData, withBase } from "vitepress";

// The browser demo is published one level above the docs; `pnpm dev:docs` uses the live one
const { lang } = useData();
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
onMounted(() => { fit(); addEventListener("resize", fit); });
onBeforeUnmount(() => removeEventListener("resize", fit));
</script>

<template>
  <figure ref="figure" class="demo" :style="{ width: `${width * scale}px` }">
    <div :style="{ height: `${height * scale}px` }">
      <iframe :key="key" :src="src" :title="ja ? 'ブラウザ版のデモ' : 'Browser demo'" allow="camera" :style="{ transform: `scale(${scale})` }"></iframe>
    </div>
    <figcaption>
      <button type="button" @click="key++">{{ ja ? "最初からやり直す" : "Start over" }}</button>
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
