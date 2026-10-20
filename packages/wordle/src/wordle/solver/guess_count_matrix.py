"""The Guess Count Matrix: how many Guesses every Opener takes to Win every Answer.

One matrix per Strategy, saved as `<out>/guess-counts/<strategy id>.npy`:

  - rows are Openers (the whole Guess List) and columns are Answers, both in the
    same sorted order as `guesses_vs_answers.npy` (14,855 x 2,315, `uint8`);
  - a cell is the Guess Count of that Game played to a Win with no Guess Limit
    (13, `UNSOLVED`, if the safety limit was hit), so a Loss keeps its real count;
  - a row of zeros is not filled yet, since no Guess Count is 0.

The file is created at full size and rows are written in place (a memory map),
so a run that fills only some Openers leaves the rest as they were.

`summary.json` ranks, for each Strategy, every Opener whose row is complete by
its Average Guess Count over all Answers, then by Expected Information as a first
Guess (higher first), then alphabetically.
"""

import json
from pathlib import Path

import numpy as np

from wordle.engine.game import MAX_GUESSES as GUESS_LIMIT
from wordle.solver.guess_counts import NextGuessCache, guess_counts
from wordle.solver.matrix import CACHE_DIR
from wordle.solver.strategy import STRATEGIES, Solver, Strategy

SUBDIR = "guess-counts"
SUMMARY_FILE = "summary.json"


def matrix_path(out: Path, how: Strategy) -> Path:
    return out / SUBDIR / f"{how.id}.npy"


def _open(path: Path, shape: tuple[int, int]) -> np.ndarray:
    """The memory-mapped matrix at `path`, created full of zeros if missing."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        matrix = np.load(path, mmap_mode="r+")
        if matrix.shape == shape and matrix.dtype == np.uint8:
            return matrix
        del matrix
    return np.lib.format.open_memmap(path, mode="w+", dtype=np.uint8, shape=shape)


def summarize(matrix: np.ndarray, guesses: tuple[str, ...], bits: dict[str, float], answers: frozenset[str]) -> list[dict]:
    """The ranked entries for every complete row of `matrix`; `bits` has at least those words' Expected Information."""
    complete = np.flatnonzero((matrix > 0).all(axis=1))
    totals = matrix[complete].sum(axis=1, dtype=np.int64)  # exact, so equal averages tie exactly
    order = sorted(range(len(complete)), key=lambda i: (totals[i], -bits[guesses[complete[i]]], guesses[complete[i]]))
    entries = []
    for rank, i in enumerate(order, start=1):
        row = matrix[complete[i]]
        word = guesses[complete[i]]
        entries.append(
            {
                "rank": rank,
                "word": word,
                "average_guess_count": float(totals[i]) / matrix.shape[1],
                "losses": int((row > GUESS_LIMIT).sum()),
                "distribution": [int((row == n).sum()) for n in range(1, GUESS_LIMIT + 1)],
                "bits": bits[word],
                "is_answer": word in answers,
            }
        )
    return entries


def write_summary(out: Path, solver: Solver) -> Path:
    """Rewrite `summary.json` from the matrices saved in `out`: every Strategy that has a file, rows from any earlier run included."""
    strategies = tuple(how for how in STRATEGIES if matrix_path(out, how).exists())
    matrices = {how.id: np.load(matrix_path(out, how), mmap_mode="r") for how in strategies}
    complete_rows = set()
    for matrix in matrices.values():
        complete_rows.update(np.flatnonzero((matrix > 0).all(axis=1)).tolist())
    everyone = solver.all_candidates()
    bits = {solver.guesses[r]: solver.stats(solver.guesses[r], everyone).bits for r in complete_rows}
    answers = frozenset(solver.answers)
    summary = {}
    for how in strategies:
        openers = summarize(matrices[how.id], solver.guesses, bits, answers)
        summary[how.id] = {"id": how.id, "name": how.name, "complete_rows": len(openers), "openers": openers}
    path = out / SUBDIR / SUMMARY_FILE
    path.write_text(json.dumps(summary, indent=1) + "\n")
    return path


def build(
    out: Path = CACHE_DIR,
    strategies: tuple[Strategy, ...] = STRATEGIES,
    openers: list[str] | None = None,
    solver: Solver | None = None,
) -> list[Path]:
    """Fill the Guess Count Matrix of each Strategy for `openers` (default: the whole Guess List), then write the summary.

    Rows already in a matrix file are kept, except the ones asked for, which are played again.
    Returns the files written.
    """
    if solver is None:
        solver = Solver.load()
    rows = range(len(solver.guesses)) if openers is None else sorted(solver.guesses.index(word) for word in openers)
    cache = NextGuessCache()  # the next Guess depends only on the Candidate Set, so every Opener shares it
    paths = []
    for how in strategies:
        path = matrix_path(out, how)
        matrix = _open(path, (len(solver.guesses), len(solver.answers)))
        for row in rows:
            matrix[row] = guess_counts(solver, how, solver.guesses[row], cache)  # int16 -> uint8, 1..13
        matrix.flush()
        del matrix
        paths.append(path)
    paths.append(write_summary(out, solver))
    return paths
