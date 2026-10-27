<!--
  Every possible Feedback for the first `letters` letters: <FeedbackGrowth :letters="1 + $clicks" />.
  Each added letter splits every pattern into three (Correct, Present, Absent), so the grid grows 3, 9, 27, 81, 243.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ letters: number }>()
const KIND = ['correct', 'present', 'absent']
// Cell size and grid columns per letter count, so 243 patterns still fit the slide
const CELL = [0, 30, 20, 12, 7, 4.2]
const COLS = [0, 3, 3, 9, 9, 27]

const k = computed(() => Math.min(Math.max(props.letters, 1), 5))
const count = computed(() => 3 ** k.value)
// Pattern i in base 3, most significant digit first: its children i*3+0..2 sit side by side
const patterns = computed(() =>
  Array.from({ length: count.value }, (_, i) =>
    Array.from({ length: k.value }, (_, j) => Math.floor(i / 3 ** (k.value - 1 - j)) % 3),
  ),
)

// Count the number up alongside the grid
const shown = ref(count.value)
watch(count, (to, from) => {
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min((now - start) / 800, 1)
    shown.value = Math.round(from + (to - from) * t)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
})
</script>

<template>
  <div class="growth">
    <div class="sum">
      <span class="factors">
        <template v-for="n in k" :key="n"><span v-if="n > 1"> × </span><span class="three">3</span></template>
      </span>
      <span> = </span>
      <b>{{ shown.toLocaleString('en-US') }}</b>
    </div>
    <div class="muted">{{ k }} {{ k === 1 ? 'letter' : 'letters' }}</div>
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${COLS[k]}, auto)`, gap: `${CELL[k]}px ${CELL[k] * 1.4}px`, '--cell': `${CELL[k]}px` }">
      <div
        v-for="(p, i) in patterns" :key="`${k}-${i}`" class="pattern"
        :style="{ animationDelay: `${(i / count) * 700}ms` }"
      >
        <span v-for="(m, j) in p" :key="j" class="cell" :class="KIND[m]" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.growth { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.sum { font-size: 1.8rem; font-variant-numeric: tabular-nums; }
.sum b { color: var(--correct); font-size: 2.6rem; }
.three { color: var(--text); }
.grid { display: grid; justify-content: center; margin-top: 1rem; }
.pattern { display: flex; gap: calc(var(--cell) / 5); animation: pop 0.3s ease-out both; }
.cell { width: var(--cell); height: var(--cell); border-radius: calc(var(--cell) / 6); }
.correct { background: var(--correct); }
.present { background: var(--present); }
.absent { background: var(--absent); }
@keyframes pop {
  from { opacity: 0; transform: scale(0.4); }
  to { opacity: 1; transform: scale(1); }
}
</style>
