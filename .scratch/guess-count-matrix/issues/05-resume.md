# 05: Resume, start over and Ctrl+C

**What to build:** A stopped run of `just precompute-guess-counts` picks up where it left off. A run fills only the rows that are still zero (the matrix is written in place, a row only once its Opener is fully played, and flushed regularly). When any chosen Strategy already has rows filled, the command asks "Resume, start over or cancel?" with resume as the default; `--yes` resumes without asking and `--fresh` starts over. Ctrl+C during a run stops cleanly, keeps the finished rows and still writes `summary.json`, which says how many rows each Strategy has complete.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] A second run leaves filled rows untouched (test: pre-set a known row, run again, it is still there) and fills only zero rows
- [ ] Starting over clears the matrix first (test)
- [ ] The resume / start over / cancel question, `--yes` and `--fresh` work as described; cancel writes nothing
- [ ] Ctrl+C mid-run keeps finished rows and writes a partial summary with the complete-row counts
- [ ] The Guess Count Matrix document describes resuming

See [spec](../spec.md).

## Comments
