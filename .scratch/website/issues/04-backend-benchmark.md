# Benchmark and Opener precompute

Status: done
Blocked by: 03

Extend the precompute to run the Benchmark for the three Strategies in the spec and the Opener leaderboard, and save both as JSON next to the matrices. Serve them from `/api/benchmark` and `/api/openers`.

See [spec](../spec.md).

## Comments

- `app/backend/wordle_backend/benchmark.py` plays the three Strategies from their own best Openers (tarse 3.429, raise 3.582 with 11 Losses, roate 3.479) by tree play, and the leaderboard keeps the top 500 Openers. `precompute` writes `benchmark.json` and `openers.json` (about 11 s on 4 threads; `--skip-benchmark` and `--benchmark-only` flags). `/api/benchmark` and `/api/openers?top=` answer 503 if the files are missing. `packages/wordle` has no Benchmark; a scratch script matched its Solver's Guess Counts for 58 sampled Answers per Strategy. Details in `docs/documents/web-backend.md`.
