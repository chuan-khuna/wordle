# 06: Threads and tqdm progress bars

**What to build:** `just precompute-guess-counts` spreads the Openers over a thread pool and shows its progress. It asks "How many threads?" with the same choices as `just precompute` (1, 2, 4, 8), skipped by `--threads N`. The threads share one memory map of the Feedback Matrices and one next-Guess cache, and each writes only its own rows. tqdm (added to the package's dependencies) draws one overall bar, Openers done out of the rows to fill across every chosen Strategy with rate and time left, starting at the rows already done on a resume; and one bar per thread, on its own line, for the Opener it is playing, labelled with the Strategy id and the word, counting Answers settled out of 2,315.

**Blocked by:** 05 (rows committed from several threads must follow the resume rules)

**Status:** ready-for-agent

- [ ] The thread question and `--threads N` work; the build function takes the thread count
- [ ] One thread and several threads give byte-identical files (test)
- [ ] The overall bar and the per-thread bars show as described, and do not garble each other
- [ ] Ctrl+C with several threads still keeps the finished rows
- [ ] The Guess Count Matrix document describes the threads and bars, with a measured speed-up on a few hundred Candidates-only and a few dozen global Openers

See [spec](../spec.md).

## Comments
