# 02: Four named Strategies, with `expected-candidates` in the Benchmark

**What to build:** The named Strategies are defined once in the package (moved from the backend's Benchmark), and there are four: every combination of scope (Candidates only, or the Guess List) and ranking (Expected Information, or Expected Candidates). The new one is `expected-candidates`, "Expected Candidates, Candidates only". The Benchmark plays all four, each from its own first pick on the full Answer List, and the website's Benchmark chart shows the fourth with the next theme colour.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The four Strategies (`bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`) are defined in the package, with id, name, pool, scope and ranking; the backend's Benchmark uses them
- [x] `/api/benchmark` returns four Strategies, in that order
- [x] The Benchmark chart and its table show four Strategies; the `strategies` prop and URL param accept `expected-candidates`
- [x] The parametrised Benchmark tests pass for all four
- [x] The Benchmark is re-run and the web backend document's results table has the fourth row; the web frontend document names the fourth Strategy and its colour

See [spec](../spec.md).

## Comments

Done. `Strategy` and `STRATEGIES` now live in `wordle/solver/strategy.py` (renamed from the backend's `BenchmarkStrategy`/`BENCHMARK_STRATEGIES`), in the spec's order. The reorder changes the chart colours by position (`bits-candidates` accent, `expected-candidates` present, `bits-all` correct, `expected-all` error); no MDX Article passes `strategies=`, so none is affected. New row: `expected-candidates`, opener raise, average 3.603, 14 Losses.
