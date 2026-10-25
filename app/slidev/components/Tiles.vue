<!--
  A Guess as Wordle Tiles: <Tiles word="crane" marks="00102" />.
  marks is one digit per letter, as the backend sends them: 0 Absent, 1 Present, 2 Correct.
  Without marks the Tiles are blank (a word typed but not yet scored).
-->
<script setup lang="ts">
const props = defineProps<{ word: string; marks?: string; size?: 'sm' | 'md' | 'lg' }>()
const KIND = ['absent', 'present', 'correct']
const kind = (i: number) => (props.marks ? KIND[Number(props.marks[i])] : 'blank')
</script>

<template>
  <div class="tiles" :class="size ?? 'md'">
    <span v-for="(letter, i) in word" :key="i" class="tile" :class="kind(i)">{{ letter }}</span>
  </div>
</template>

<style scoped>
.tiles { display: inline-flex; gap: 0.3em; }
.tile {
  display: inline-grid; place-items: center;
  width: 1.9em; height: 1.9em;
  font-family: var(--slidev-font-mono, monospace); font-weight: 700; text-transform: uppercase;
  border: 2px solid var(--absent); border-radius: 4px;
}
.sm { font-size: 0.9rem; }
.md { font-size: 1.4rem; }
.lg { font-size: 2.2rem; }
.correct { background: var(--correct); border-color: var(--correct); color: var(--on-mark); }
.present { background: var(--present); border-color: var(--present); color: var(--on-mark); }
.absent { background: var(--absent); border-color: var(--absent); color: var(--on-mark); }
.blank { color: var(--text); }
</style>
