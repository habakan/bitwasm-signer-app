<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Demo from "./Demo.vue";

// VitePress shows the right column from 1280px; narrower pages get the phone above the text
const { frontmatter } = useData();
const wide = ref(true);
onMounted(() => {
  const query = matchMedia("(min-width: 1280px)");
  wide.value = query.matches;
  query.onchange = (event) => (wide.value = event.matches);
});
</script>

<template>
  <DefaultTheme.Layout>
    <template #aside-top><Demo v-if="frontmatter.demo && wide" /></template>
    <template #doc-before><Demo v-if="frontmatter.demo && !wide" /></template>
  </DefaultTheme.Layout>
</template>
