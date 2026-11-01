<script setup lang="ts">
import { computed } from "vue";
import { useData, withBase } from "vitepress";

// Drawn in the app's colours, one file per language and theme (rendered from Mermaid)
const props = defineProps<{ name: string; alt: string; width?: number }>();
const { lang, isDark } = useData();
const src = computed(() => withBase(`/diagrams/${props.name}-${lang.value}-${isDark.value ? "dark" : "light"}.svg`));
</script>

<template>
  <figure class="diagram"><img :src="src" :alt="alt" :style="width ? { maxWidth: `${width}px` } : undefined"></figure>
</template>

<style scoped>
.diagram { margin: 24px 0; }
.diagram img { display: block; width: 100%; height: auto; margin: 0 auto; }
</style>
