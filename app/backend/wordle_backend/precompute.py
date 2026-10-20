"""`just backend-precompute`: write the Feedback matrices, the Benchmark and the Opener leaderboard into `precompute-cache/`."""

import argparse
import time
from pathlib import Path

from wordle.solver import matrix
from wordle.solver.matrix import ANSWERS_FILE, CACHE_DIR, GUESSES_FILE
from wordle_backend import benchmark
from wordle_backend.solver import WebSolver


def main() -> None:
    parser = argparse.ArgumentParser(description="Precompute the Feedback matrices, the Benchmark and the Opener leaderboard.")
    parser.add_argument("--out", type=Path, default=CACHE_DIR, help="cache directory (Feedback matrices in feedback/, Benchmark files in benchmark/)")
    parser.add_argument("--threads", type=int, default=1, help="worker threads (default 1)")
    parser.add_argument("--yes", action="store_true", help="overwrite existing files without asking")
    only = parser.add_mutually_exclusive_group()
    only.add_argument("--skip-benchmark", action="store_true", help="write only the Feedback matrices")
    only.add_argument("--benchmark-only", action="store_true", help="reuse the existing matrices and write only the Benchmark and Openers")
    args = parser.parse_args()
    if args.threads < 1:
        parser.error("--threads must be at least 1")

    feedback_dir, benchmark_dir = args.out / "feedback", args.out / "benchmark"
    paths = [] if args.benchmark_only else [feedback_dir / ANSWERS_FILE, feedback_dir / GUESSES_FILE]
    if not args.skip_benchmark:
        paths += [benchmark_dir / benchmark.BENCHMARK_FILE, benchmark_dir / benchmark.OPENERS_FILE]
    existing = [p for p in paths if p.exists()]
    if existing and not args.yes:
        listed = ", ".join(p.name for p in existing)
        if input(f"{listed} already in {args.out}. Overwrite? [y/N] ").strip().lower() != "y":
            return

    plural = "s" if args.threads > 1 else ""
    if not args.benchmark_only:
        started = time.perf_counter()
        for path in matrix.build(feedback_dir, args.threads):
            print(f"{path} ({path.stat().st_size / 1_000_000:.1f} MB)")
        print(f"Matrices done in {time.perf_counter() - started:.1f}s with {args.threads} thread{plural}.")
    if args.skip_benchmark:
        return

    started = time.perf_counter()
    solver = WebSolver.load(feedback_dir)
    results = benchmark.run_benchmarks(solver, args.threads)
    for result in results:
        print(f"{result['name']}: Opener {result['opener']}, Average Guess Count {result['average_guess_count']:.3f}, "
              f"{result['losses']} Losses")
    for path in benchmark.save(results, benchmark.opener_leaderboard(solver), benchmark_dir):
        print(path)
    print(f"Benchmark done in {time.perf_counter() - started:.1f}s with {args.threads} thread{plural}.")


if __name__ == "__main__":
    main()
