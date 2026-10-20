# 03: Average Guess Count and Guess Distribution in the Solver panel

**What to build:** Before the first Guess, the Solver panel shows what `summary.json` knows under its current Strategy: each Suggestion's Average Guess Count, and for the charted word its Average Guess Count, Losses and a Guess Distribution bar chart (Guess Counts 1 to 6, then Lost) in theme colours. When the summary is missing, the Strategy has no Guess Count Matrix, or the Opener's row is unfinished, a short note says so and names the command that fills it. The panel reads the summary when it opens and after a run ends. After the first Guess none of it shows.

**Blocked by:** 02

**Status:** done

- [x] The library reads `summary.json` into a lookup by Strategy and word (tested on a small file)
- [x] The Suggestions and the chart area show the results before the first Guess, and nothing after it
- [x] The missing / unfinished note works
- [x] The summary is reloaded after Precompute guess counts ends
- [x] The gpui app document describes it

See [spec](../spec.md).

## Comments

- 2026-10-20: Done. `solver/opener_results.rs` reads `summary.json` into a lookup by Strategy id and word (`read_summary`: `Missing`, `Unreadable`, `Read`) and `lookup(summary, strategy, word, guesses made)` decides what the panel shows: `Hidden` after the first Guess, the result, or a reason with its `note()` (no summary, settings with no named Strategy, a Strategy not in the summary, an unfinished row), the three a run can fill with a **Precompute guess counts…** button; `OpenerResult::bars()` gives Guess Counts 1 to 6 then Lost. Tested on a small summary file in a temp folder, plus a check that the real `precompute-cache/` summary reads. The panel (`ui/solver_panel.rs`) shows each Suggestion's Average Guess Count and, under the Feedback Split, the charted word's average, Losses, rank and Guess Distribution bars (won in the Correct colour, Lost in the error colour). The summary is read on a background thread when the panel opens and when a Precompute guess counts run ends (`ui/mod.rs`). The note shows only for a charted word, not when nothing is charted. Not checked by hand in the UI.
