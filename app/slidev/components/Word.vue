<!-- A word in a box of monospace, as the Articles set words in prose: <Word>tarse</Word> -->
<template>
  <span class="word"><slot /></span>
</template>

<style scoped>
.word {
  font-family: var(--slidev-font-mono, monospace);
  padding: 0 0.3em;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background: var(--surface);
}
</style>
