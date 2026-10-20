# 03: Average Guess Count and Guess Distribution in the Solver panel

**What to build:** Before the first Guess, the Solver panel shows what `summary.json` knows under its current Strategy: each Suggestion's Average Guess Count, and for the charted word its Average Guess Count, Losses and a Guess Distribution bar chart (Guess Counts 1 to 6, then Lost) in theme colours. When the summary is missing, the Strategy has no Guess Count Matrix, or the Opener's row is unfinished, a short note says so and names the command that fills it. The panel reads the summary when it opens and after a run ends. After the first Guess none of it shows.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The library reads `summary.json` into a lookup by Strategy and word (tested on a small file)
- [ ] The Suggestions and the chart area show the results before the first Guess, and nothing after it
- [ ] The missing / unfinished note works
- [ ] The summary is reloaded after Precompute guess counts ends
- [ ] The gpui app document describes it

See [spec](../spec.md).

## Comments
