# 01: Four named Strategies in the gpui app, and Rank by

**What to build:** The gpui Solver ranks by Expected Information or Expected Candidates, breaks ties exactly as the Python Solver does (primary measure rounded to nine decimals, then Candidate first, then the other measure, then alphabetical), and goes Candidates only with two or fewer Candidates left. The library names the four Strategies (`bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`). The Solver panel gets a **Rank by** setting and names the Strategy its settings amount to (none for Answers with All words).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The library ranks by either measure with the Python tie-breaks and the two-Candidates rule
- [x] The four named Strategies exist in the library
- [x] Tests: for a few States and each Strategy, the top Suggestions equal values printed by the Python Solver, including a tie broken only by the second measure
- [x] The Solver panel has Rank by and shows the Strategy name
- [x] `cargo test` passes; the gpui app document describes the setting

See [spec](../spec.md).

## Comments

Done. `strategy::suggest` takes a `Rank`, rounds both measures with `round9` (numpy's algorithm), and applies the two-Candidates rule; `STRATEGIES` and `Strategy::named` name the four. Tests compare five States against values printed by the Python Solver (empty, CRANE/THUMB, SLATE/ROOST with a second-measure tie, ADIEU+PIOUS/FLUME, CRANE/ACORN with two Candidates). The panel's **Rank by** buttons are labelled "Information" and "Candidates" to fit the 340 px panel; the full Strategy name is shown below the settings. Not checked by hand in the UI.
