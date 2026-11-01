<script setup lang="ts">
import { computed } from "vue";
import { useData, withBase } from "vitepress";

// The screen for the step above it, opening full size on tap; several in a row are wrapped in <div class="shots">
const props = defineProps<{ name: string; caption?: string; wide?: boolean; plain?: boolean }>();
const { lang } = useData();
const src = computed(() => withBase(`/quickstart/${lang.value}-${props.name}.webp`));
</script>

<template>
  <figure class="shot" :class="{ wide, plain }"><a :href="src" target="_blank" rel="noopener"><img :src="src" :alt="caption ?? ''" loading="lazy"></a><figcaption v-if="caption">{{ caption }}</figcaption></figure>
</template>

<style scoped>
.shot { margin: 16px 0; }
.shot img { display: block; margin: 0 auto; width: 360px; max-width: 100%; border: 8px solid #16191c; border-radius: 40px; box-shadow: 0 0 0 1px var(--line); }
.shot.wide img { width: 100%; border-width: 1px; border-color: var(--line); border-radius: var(--radius-md); }
.shot.plain img { width: 160px; border: 0; border-radius: var(--radius-lg); }
.shot figcaption { max-width: 360px; margin: 8px auto 0; text-align: center; color: var(--vp-c-text-2); font-size: 13px; line-height: 20px; }
</style>
