<script setup lang="ts">
import { ref } from "vue";
import { useData, withBase } from "vitepress";

// The browser demo is published one level above the docs; `pnpm dev:docs` uses the live one
const { lang } = useData();
const home = import.meta.env.DEV ? "https://habakan.github.io/bitwasm-signer-app/" : withBase("/../");
const src = `${home}?lang=${lang.value}`;
const key = ref(0);
const ja = lang.value === "ja";
</script>

<template>
  <figure class="demo">
    <iframe :key="key" :src="src" :title="ja ? 'ブラウザ版のデモ' : 'Browser demo'" allow="camera"></iframe>
    <figcaption>
      <button type="button" @click="key++">{{ ja ? "最初からやり直す" : "Start over" }}</button>
      <a :href="src" target="_blank" rel="noopener">{{ ja ? "別のタブで開く" : "Open in a new tab" }}</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.demo { margin: 0 auto 24px; width: 360px; max-width: 100%; }
.demo iframe { display: block; width: 100%; height: 600px; border: 10px solid #16191c; border-radius: 40px; background: #fff; }
.demo figcaption { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; }
.demo :is(button, a) { color: var(--vp-c-brand-1); }
/* In the right column, sized so the whole phone fits the window */
:global(.aside) .demo { margin: 0; }
:global(.aside) .demo iframe { height: min(780px, calc(100vh - var(--vp-nav-height) - 120px)); }
:global(.VPDoc:has(.demo) .aside) { max-width: 392px; }
:global(.VPDoc:has(.demo) :is(.aside-container, .aside-curtain)) { width: 360px; }
</style>
