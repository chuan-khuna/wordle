# 05: Resume, start over and Ctrl+C

**What to build:** A stopped run of `just precompute-guess-counts` picks up where it left off. A run fills only the rows that are still zero (the matrix is written in place, a row only once its Opener is fully played, and flushed regularly). When any chosen Strategy already has rows filled, the command asks "Resume, start over or cancel?" with resume as the default; `--yes` resumes without asking and `--fresh` starts over. Ctrl+C during a run stops cleanly, keeps the finished rows and still writes `summary.json`, which says how many rows each Strategy has complete.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] A second run leaves filled rows untouched (test: pre-set a known row, run again, it is still there) and fills only zero rows
- [ ] Starting over clears the matrix first (test)
- [ ] The resume / start over / cancel question, `--yes` and `--fresh` work as described; cancel writes nothing
- [ ] Ctrl+C mid-run keeps finished rows and writes a partial summary with the complete-row counts
- [ ] The Guess Count Matrix document describes resuming

The file format decided in [ADR 0001](../../../docs/adr/0001-guess-count-matrix-file-format.md) (from [RFC 01](../../../docs/rfc/01-guess-count-matrix-file-format.md)) lands here too:

- [ ] `guess-counts/manifest.json` (format version, `rows` = sorted Guess List, `columns` = Answer List, each Strategy's id, name, pool, scope, ranked by, and the safety limit, and the tool that wrote it) is written before any row; a resume refuses, and says to use `--fresh`, when the word lists or a chosen Strategy's definition differ (test)
- [ ] A finished row played again (`--opener`) is zeroed before it is rewritten
- [ ] `summary.json` is written compact (no indent)
- [ ] Each run also writes `<id>.ranking.csv` per Strategy (`rank,opener,average_guess_count,losses,won_in_1,…,won_in_6,bits,is_answer`) from the same data as the summary, with the standard library's `csv` (test: it matches the summary)
- [ ] The Guess Count Matrix document describes the manifest and the ranking CSV, and links the ADR

See [spec](../spec.md).

## Comments
