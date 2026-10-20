# 06: Threads and tqdm progress bars

**What to build:** `just precompute-guess-counts` spreads the Openers over a thread pool and shows its progress. It asks "How many threads?" with the same choices as `just precompute` (1, 2, 4, 8), skipped by `--threads N`. The threads share one memory map of the Feedback Matrices and one next-Guess cache, and each writes only its own rows. tqdm (added to the package's dependencies) draws one overall bar, Openers done out of the rows to fill across every chosen Strategy with rate and time left, starting at the rows already done on a resume; and one bar per thread, on its own line, for the Opener it is playing, labelled with the Strategy id and the word, counting Answers settled out of 2,315.

**Blocked by:** 05 (rows committed from several threads must follow the resume rules)

**Status:** done

- [x] The thread question and `--threads N` work; the build function takes the thread count
- [x] One thread and several threads give byte-identical files (test)
- [x] The overall bar and the per-thread bars show as described, and do not garble each other
- [x] Ctrl+C with several threads still keeps the finished rows
- [x] The Guess Count Matrix document describes the threads and bars, with a measured speed-up on a few hundred Candidates-only and a few dozen global Openers

See [spec](../spec.md).

## Comments

Built in `solver/guess_count_matrix.py` (`build(..., threads, progress)` and `_fill`), `guess_counts(..., settled)` and `cli.precompute_guess_counts` (the thread question via `ask_threads`/`add_threads_flag`, shared with `just precompute`; tqdm added with `uv add`). Workers only play Openers and hand the counts back on a queue; the calling thread is the one writer (zero, then the whole row; flush every 10 s), so the resume rules hold unchanged. Ctrl+C sets a stop flag that each worker sees at its next settled group, dropping its Opener in flight. Tests: 1 vs 4 threads give byte-identical folders (both Candidates-only Strategies, 8 Openers); Ctrl+C on 4 threads keeps exactly the committed rows; the thread question and `--threads`. A real SIGINT on 4 threads kept 109 complete rows and no partial one.

Measured on an M1 Pro (CPython 3.14 with the GIL): Candidates-only Strategies get slower with threads (300 Openers: 10.1 s on 1, 31.9 s on 8); global ones gain 2.6x on 4 threads and 3.3x to 3.7x on 8 (24 Openers: 199 s -> 60 s). Ticket 07 should consider processes.

Not ticked: the bars were checked only from captured stderr in a non-interactive shell (one "Openers" bar at position 0, one labelled bar per thread on positions 1..N with cursor-up codes, total and initial right); how they look in a real terminal, and that they don't garble each other there, still needs a look by a human. Status stays ready-for-agent until then.

2026-10-20: checked by hand in a real terminal (4 threads, `bits-candidates`): the overall bar and the per-thread bars show as described and do not garble each other, and Ctrl+C kept the 37 finished rows and wrote the summary. Closed. The "Openers" label is now yellow (`termcolor`).
