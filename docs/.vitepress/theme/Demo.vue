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
.demo { margin: 16px auto; width: 320px; }
.demo iframe { display: block; width: 100%; height: 600px; border: 10px solid #16191c; border-radius: 36px; background: #fff; }
.demo figcaption { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; }
.demo button { color: var(--vp-c-brand-1); }
@media (min-width: 1200px) {
  /* The text keeps a right column free, so the phone can stay in view while the page scrolls */
  .demo { position: sticky; top: calc(var(--vp-nav-height) + 24px); float: right; margin: 0 -352px 24px 32px; }
  :global(.vp-doc:has(.demo)) { padding-right: 352px; }
}
</style>
