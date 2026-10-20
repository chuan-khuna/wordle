# 01: Four named Strategies in the gpui app, and Rank by

**What to build:** The gpui Solver ranks by Expected Information or Expected Candidates, breaks ties exactly as the Python Solver does (primary measure rounded to nine decimals, then Candidate first, then the other measure, then alphabetical), and goes Candidates only with two or fewer Candidates left. The library names the four Strategies (`bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`). The Solver panel gets a **Rank by** setting and names the Strategy its settings amount to (none for Answers with All words).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The library ranks by either measure with the Python tie-breaks and the two-Candidates rule
- [ ] The four named Strategies exist in the library
- [ ] Tests: for a few States and each Strategy, the top Suggestions equal values printed by the Python Solver, including a tie broken only by the second measure
- [ ] The Solver panel has Rank by and shows the Strategy name
- [ ] `cargo test` passes; the gpui app document describes the setting

See [spec](../spec.md).

## Comments
