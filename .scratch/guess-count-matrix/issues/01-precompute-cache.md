# 01: Move every precomputed file into `precompute-cache/`

**What to build:** One gitignored `precompute-cache/` at the repo root replaces the three `matrices/` folders (repo root, backend, gpui app). The Feedback Matrices live in `precompute-cache/feedback/`, the Benchmark and Opener leaderboard in `precompute-cache/benchmark/`. `just precompute`, `just backend-precompute`, the backend at startup and the gpui app all read and write that one copy, so a fresh clone needs one precompute for all three apps. A prefactor for the Guess Count Matrix, which will write `precompute-cache/guess-counts/`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The package's default matrix directory is `precompute-cache/feedback/`
- [ ] The backend reads the Feedback Matrices from `precompute-cache/feedback/` and `benchmark.json` / `openers.json` from `precompute-cache/benchmark/`; `just backend-precompute` writes there (its `--out` still works)
- [ ] The gpui app reads and precomputes the Feedback Matrices in `precompute-cache/feedback/`
- [ ] `.gitignore` ignores `precompute-cache/` instead of `matrices/`
- [ ] The package tests, the backend tests and `cargo test` pass
- [ ] The Feedback Matrices, web backend and gpui app documents (and the index, if a summary changes) give the new paths

See [spec](../spec.md).

## Comments
