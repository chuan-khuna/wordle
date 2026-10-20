# 02: Four named Strategies, with `expected-candidates` in the Benchmark

**What to build:** The named Strategies are defined once in the package (moved from the backend's Benchmark), and there are four: every combination of scope (Candidates only, or the Guess List) and ranking (Expected Information, or Expected Candidates). The new one is `expected-candidates`, "Expected Candidates, Candidates only". The Benchmark plays all four, each from its own first pick on the full Answer List, and the website's Benchmark chart shows the fourth with the next theme colour.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The four Strategies (`bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`) are defined in the package, with id, name, pool, scope and ranking; the backend's Benchmark uses them
- [ ] `/api/benchmark` returns four Strategies, in that order
- [ ] The Benchmark chart and its table show four Strategies; the `strategies` prop and URL param accept `expected-candidates`
- [ ] The parametrised Benchmark tests pass for all four
- [ ] The Benchmark is re-run and the web backend document's results table has the fourth row; the web frontend document names the fourth Strategy and its colour

See [spec](../spec.md).

## Comments
