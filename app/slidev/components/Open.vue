<!--
  A link to the website, opened in a new tab: <Open href="/th/articles/rules">Article 01</Open>.
  href is a path on the site; the site is VITE_SITE_URL (default http://localhost:3000, the `just web` dev server).
-->
<script setup lang="ts">
const props = defineProps<{ href: string }>()
const site = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000'
const url = site + props.href
</script>

<template>
  <a class="open" :href="url" target="_blank" rel="noopener">↗ <slot /></a>
</template>

<style scoped>
.open {
  display: inline-block;
  font-size: 0.8rem;
  padding: 0.2em 0.6em;
  border: 1px solid var(--accent);
  border-radius: 999px;
  color: var(--accent);
  text-decoration: none;
}
</style>
