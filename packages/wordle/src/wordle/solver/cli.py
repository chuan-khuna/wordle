"""`just precompute` and `just precompute-guess-counts`: ask a few questions, then precompute."""

import argparse
import json
import sys
import time
from pathlib import Path

import questionary

from wordle.solver import guess_count_matrix
from wordle.solver.matrix import (
    ANSWERS_FILE,
    CACHE_DIR,
    DEFAULT_DIR,
    GUESSES_FILE,
    THREAD_CHOICES,
    build,
)
from wordle.solver.strategy import STRATEGIES, Solver


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


TOP = 5  # Openers shown per Strategy at the end of `just precompute-guess-counts`


def precompute_guess_counts() -> None:
    parser = argparse.ArgumentParser(description="Precompute the Guess Count Matrix of each Strategy.")
    parser.add_argument("--out", type=Path, default=CACHE_DIR, help="output directory")
    parser.add_argument(
        "--strategy",
        action="append",
        choices=[how.id for how in STRATEGIES],
        help="a Strategy to compute (repeatable); skips the question",
    )
    parser.add_argument("--opener", action="append", help="fill only this Opener's row (repeatable), for quick checks")
    again = parser.add_mutually_exclusive_group()
    again.add_argument("--yes", action="store_true", help="resume a matrix that has rows without asking")
    again.add_argument("--fresh", action="store_true", help="start each chosen matrix over without asking")
    args = parser.parse_args()

    if args.strategy:
        chosen = tuple(how for how in STRATEGIES if how.id in args.strategy)
    else:
        answer = questionary.checkbox(
            "Which Strategies?",
            choices=[questionary.Choice(how.name, value=how, checked=True) for how in STRATEGIES],
        ).ask()
        if not answer:  # Ctrl+C, or nothing ticked
            return
        chosen = tuple(answer)

    solver = Solver.load()
    fresh = args.fresh
    done = {how: guess_count_matrix.filled_rows(args.out, how) for how in chosen}
    if not fresh and any(done.values()):
        for how in chosen:
            if done[how] and (reason := guess_count_matrix.mismatch(args.out, how, solver)):
                sys.exit(f"Can't resume {how.id}: {reason}. Run again with --fresh to start it over.")
        if not args.yes:
            lines = "\n".join(f"  {how.id}: {n} of {len(solver.guesses)} Openers have rows" for how, n in done.items())
            answer = questionary.select(
                f"These matrices are already filled:\n{lines}\nResume, start over or cancel?",
                choices=[
                    questionary.Choice("Resume (fill the rows still empty)", value="resume"),
                    questionary.Choice("Start over (clear the chosen matrices)", value="fresh"),
                    questionary.Choice("Cancel", value="cancel"),
                ],
                default="resume",
            ).ask()
            if answer in (None, "cancel"):  # Ctrl+C, or cancel: write nothing
                return
            fresh = answer == "fresh"

    started = time.perf_counter()
    try:
        guess_count_matrix.build(args.out, chosen, args.opener, solver, fresh)
    except KeyboardInterrupt:
        print("\nInterrupted. Finished rows are kept and the summary is written; run again to resume.")
    elapsed = time.perf_counter() - started
    summary_path = args.out / guess_count_matrix.SUBDIR / guess_count_matrix.SUMMARY_FILE
    for path in sorted(summary_path.parent.iterdir()):
        print(f"{path} ({path.stat().st_size / 1_000_000:.1f} MB)")
    summary = json.loads(summary_path.read_text())
    for how in chosen:
        entry = summary[how.id]
        print(f"\n{how.name}: {entry['complete_rows']} Openers complete")
        for opener in entry["openers"][:TOP]:
            print(
                f"  {opener['rank']}. {opener['word']}  {opener['average_guess_count']:.3f} Guesses,"
                f" {opener['losses']} Losses, {opener['bits']:.3f} bits"
            )
    print(f"\nDone in {elapsed:.1f}s.")


if __name__ == "__main__":
    precompute_matrix()
