# 05: Migrate the real cache, play the Answer List with All words Strategies, and commit the backup

**What to build:** The real `precompute-cache/guess-counts/` is version 2 with all eight matrices finished, the Benchmark has all eight Strategies, and the backup in `data/precompute/` is updated.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] `just restore-cache` (if the local cache is missing), then `just migrate-guess-counts` on the real folder
- [ ] `bits/answers-all` and `expected/answers-all` are played with the gpui app's Rust build (fast) or `just precompute-guess-counts`
- [ ] The cost (time, threads, machine) is recorded under Cost in `guess-count-matrix.md`
- [ ] `just precompute-benchmark` is rerun, so the Benchmark has eight Strategies
- [ ] `summary.json` has eight Strategies, each with every row complete
- [ ] The Results section of `guess-count-matrix.md` gives the top 5 of each Strategy, and says how `answers-all` compares with `guesses-all`
- [ ] `just backup-cache` is rerun, and the version 2 `data/precompute/guess-counts/` replaces the version 1 files in a commit

See [spec](../spec.md).

## Comments
