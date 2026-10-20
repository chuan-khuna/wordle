"""`just backend-precompute`: write the Feedback matrices into `matrices/`."""

import argparse
import time
from pathlib import Path

from wordle_backend.matrices import ANSWERS_FILE, DEFAULT_DIR, GUESSES_FILE, build


def main() -> None:
    parser = argparse.ArgumentParser(description="Precompute the Feedback matrices.")
    parser.add_argument("--out", type=Path, default=DEFAULT_DIR, help="output directory")
    parser.add_argument("--threads", type=int, default=1, help="worker threads (default 1)")
    parser.add_argument("--yes", action="store_true", help="overwrite existing files without asking")
    args = parser.parse_args()
    if args.threads < 1:
        parser.error("--threads must be at least 1")

    existing = [p for p in (args.out / ANSWERS_FILE, args.out / GUESSES_FILE) if p.exists()]
    if existing and not args.yes:
        names = ", ".join(p.name for p in existing)
        if input(f"{names} already in {args.out}. Overwrite? [y/N] ").strip().lower() != "y":
            return

    started = time.perf_counter()
    paths = build(args.out, args.threads)
    elapsed = time.perf_counter() - started
    for path in paths:
        print(f"{path} ({path.stat().st_size / 1_000_000:.1f} MB)")
    print(f"Done in {elapsed:.1f}s with {args.threads} thread{'s' if args.threads > 1 else ''}.")


if __name__ == "__main__":
    main()
