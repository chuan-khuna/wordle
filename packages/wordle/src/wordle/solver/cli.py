"""`wordle-matrices`: ask a few questions, then precompute the Feedback matrices."""

import argparse
import time
from pathlib import Path

import questionary

from wordle.solver.matrix import (
    ANSWERS_FILE,
    DEFAULT_DIR,
    GUESSES_FILE,
    THREAD_CHOICES,
    build,
)


def precompute_matrix() -> None:
    parser = argparse.ArgumentParser(description="Precompute the Feedback matrices.")
    parser.add_argument("--out", type=Path, default=DEFAULT_DIR, help="output directory")
    parser.add_argument(
        "--threads",
        type=int,
        choices=THREAD_CHOICES,
        help="worker threads; skips the question",
    )
    parser.add_argument("--yes", action="store_true", help="overwrite existing files without asking")
    args = parser.parse_args()

    threads = args.threads
    if threads is None:
        answer = questionary.select(
            "How many threads?",
            choices=[questionary.Choice(str(n), value=n) for n in THREAD_CHOICES],
            default=THREAD_CHOICES[0],
        ).ask()
        if answer is None:  # Ctrl+C
            return
        threads = answer

    existing = [p for p in (args.out / ANSWERS_FILE, args.out / GUESSES_FILE) if p.exists()]
    if existing and not args.yes:
        overwrite = questionary.confirm(
            f"{', '.join(p.name for p in existing)} already in {args.out}. Overwrite?",
            default=False,
        ).ask()
        if not overwrite:
            return

    started = time.perf_counter()
    paths = build(args.out, threads)
    elapsed = time.perf_counter() - started
    for path in paths:
        print(f"{path} ({path.stat().st_size / 1_000_000:.1f} MB)")
    print(f"Done in {elapsed:.1f}s with {threads} thread{'s' if threads > 1 else ''}.")


if __name__ == "__main__":
    precompute_matrix()
