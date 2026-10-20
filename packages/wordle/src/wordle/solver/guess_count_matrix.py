"""The Guess Count Matrix: how many Guesses every Opener takes to Win every Answer.

One matrix per Strategy, saved as `<out>/guess-counts/<strategy id>.npy`:

  - rows are Openers (the whole Guess List) and columns are Answers, both in the
    same sorted order as `guesses_vs_answers.npy` (14,855 x 2,315, `uint8`);
  - a cell is the Guess Count of that Game played to a Win with no Guess Limit
    (13, `UNSOLVED`, if the safety limit was hit), so a Loss keeps its real count;
  - a row of zeros is not filled yet, since no Guess Count is 0.

The file is created at full size and rows are written in place (a memory map),
so a run that fills only some Openers leaves the rest as they were. A row is
written only once its Opener is fully played, after being zeroed, and the map is
flushed every few seconds, so a stop loses at most the rows in flight. A plain
run fills only the rows with a zero cell; asking for Openers plays them again.

`manifest.json` (see ADR 0001) records the word lists (`rows`, `columns`) and each
Strategy's definition, written before any row. A matrix with rows is resumed only
if the manifest matches the current word lists and Strategy; otherwise `build`
raises `ManifestMismatch` and the caller starts over with `fresh=True`.

`summary.json` ranks, for each Strategy, every Opener whose row is complete by
its Average Guess Count over all Answers, then by Expected Information as a first
Guess (higher first), then alphabetically. `<id>.ranking.csv` holds the same
entries for a spreadsheet.
"""

import csv
import json
import time
from collections.abc import Callable
from pathlib import Path

import numpy as np

from wordle.engine.game import MAX_GUESSES as GUESS_LIMIT
from wordle.solver.guess_counts import SAFETY_LIMIT, NextGuessCache, guess_counts
from wordle.solver.matrix import CACHE_DIR
from wordle.solver.strategy import STRATEGIES, Solver, Strategy

SUBDIR = "guess-counts"
SUMMARY_FILE = "summary.json"
MANIFEST_FILE = "manifest.json"
FORMAT_VERSION = 1
TOOL = "wordle precompute-guess-counts (python)"
FLUSH_SECONDS = 10  # how often finished rows are flushed to disk during a run
RANKING_COLUMNS = (
    ["rank", "opener", "average_guess_count", "losses"]
    + [f"won_in_{n}" for n in range(1, GUESS_LIMIT + 1)]
    + ["bits", "is_answer"]
)


class ManifestMismatch(Exception):
    """A matrix on disk can't be resumed: the word lists or the Strategy are not the ones that filled it."""


def matrix_path(out: Path, how: Strategy) -> Path:
    return out / SUBDIR / f"{how.id}.npy"


def ranking_path(out: Path, how: Strategy) -> Path:
    return out / SUBDIR / f"{how.id}.ranking.csv"


def _definition(how: Strategy) -> dict:
    return {"name": how.name, "pool": how.pool, "scope": how.scope, "ranked_by": how.by}


def _manifest(out: Path) -> dict | None:
    path = out / SUBDIR / MANIFEST_FILE
    return json.loads(path.read_text()) if path.exists() else None


def _same_lists(manifest: dict | None, solver: Solver) -> bool:
    return (
        manifest is not None
        and manifest.get("format_version") == FORMAT_VERSION
        and manifest.get("safety_limit") == SAFETY_LIMIT
        and manifest.get("rows") == list(solver.guesses)
        and manifest.get("columns") == list(solver.answers)
    )


def mismatch(out: Path, how: Strategy, solver: Solver) -> str | None:
    """Why the matrix of `how` in `out` can't be resumed or summarized, or None if the manifest vouches for it."""
    manifest = _manifest(out)
    if manifest is None:
        return f"there is no {MANIFEST_FILE}"
    if not _same_lists(manifest, solver):
        return f"the word lists, format or safety limit in {MANIFEST_FILE} differ from the current ones"
    if manifest.get("strategies", {}).get(how.id) != _definition(how):
        return f"{how.id} is not defined in {MANIFEST_FILE} as it is now"
    return None


def filled_rows(out: Path, how: Strategy) -> int:
    """How many rows of the matrix of `how` in `out` hold any Guess Count (0 if there is no file)."""
    path = matrix_path(out, how)
    if not path.exists():
        return 0
    return int(np.count_nonzero(np.load(path, mmap_mode="r").any(axis=1)))


def _write_manifest(out: Path, strategies: tuple[Strategy, ...], solver: Solver) -> None:
    """Record the word lists and `strategies`, keeping other Strategies' entries only while the lists are the same."""
    old = _manifest(out)
    kept = old["strategies"] if _same_lists(old, solver) else {}
    manifest = {
        "format_version": FORMAT_VERSION,
        "tool": TOOL,
        "safety_limit": SAFETY_LIMIT,
        "strategies": {**kept, **{how.id: _definition(how) for how in strategies}},
        "rows": list(solver.guesses),
        "columns": list(solver.answers),
    }
    path = out / SUBDIR / MANIFEST_FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest, separators=(",", ":")) + "\n")
    tmp.replace(path)


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


def write_ranking(path: Path, entries: list[dict]) -> None:
    """The ranked `entries` of one Strategy as a CSV, one Opener per line."""
    with path.open("w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(RANKING_COLUMNS)
        for e in entries:
            writer.writerow(
                [e["rank"], e["word"], e["average_guess_count"], e["losses"], *e["distribution"], e["bits"], e["is_answer"]]
            )


def write_summary(out: Path, solver: Solver) -> list[Path]:
    """Rewrite `summary.json` and the ranking CSVs from the matrices saved in `out`, rows from any earlier run included.

    Covers every Strategy that has a file the manifest vouches for. Returns the CSVs, then the summary last.
    """
    strategies = tuple(how for how in STRATEGIES if matrix_path(out, how).exists() and mismatch(out, how, solver) is None)
    matrices = {how.id: np.load(matrix_path(out, how), mmap_mode="r") for how in strategies}
    complete_rows = set()
    for matrix in matrices.values():
        complete_rows.update(np.flatnonzero((matrix > 0).all(axis=1)).tolist())
    everyone = solver.all_candidates()
    bits = {solver.guesses[r]: solver.stats(solver.guesses[r], everyone).bits for r in complete_rows}
    answers = frozenset(solver.answers)
    summary = {}
    paths = []
    for how in strategies:
        openers = summarize(matrices[how.id], solver.guesses, bits, answers)
        summary[how.id] = {"id": how.id, "name": how.name, "complete_rows": len(openers), "openers": openers}
        write_ranking(ranking_path(out, how), openers)
        paths.append(ranking_path(out, how))
    path = out / SUBDIR / SUMMARY_FILE
    path.write_text(json.dumps(summary, separators=(",", ":")) + "\n")
    return [*paths, path]


def build(
    out: Path = CACHE_DIR,
    strategies: tuple[Strategy, ...] = STRATEGIES,
    openers: list[str] | None = None,
    solver: Solver | None = None,
    fresh: bool = False,
    after_row: Callable[[Strategy, int], None] | None = None,
) -> list[Path]:
    """Fill the Guess Count Matrix of each Strategy, then write the manifest-checked summary and ranking CSVs.

    By default only the rows with a zero cell are played (a resume). With `openers`, those rows are
    played again, finished or not. `fresh` clears each Strategy's matrix first. Without `fresh`, a
    matrix that already has rows must match the manifest or `ManifestMismatch` is raised, before anything is written.
    `after_row(strategy, row)` is called once each row is committed.

    Ctrl+C keeps the finished rows, writes the summary and CSVs, then raises `KeyboardInterrupt` again.
    Returns the files written, the summary last.
    """
    if solver is None:
        solver = Solver.load()
    if not fresh:
        for how in strategies:
            if filled_rows(out, how) and (reason := mismatch(out, how, solver)):
                raise ManifestMismatch(f"{how.id}: {reason}")
    asked = None if openers is None else sorted(solver.guesses.index(word) for word in openers)
    cache = NextGuessCache()  # the next Guess depends only on the Candidate Set, so every Opener shares it
    shape = (len(solver.guesses), len(solver.answers))
    if fresh:
        for how in strategies:
            matrix_path(out, how).unlink(missing_ok=True)
    _write_manifest(out, strategies, solver)
    paths = []
    interrupted = False
    try:
        for how in strategies:
            path = matrix_path(out, how)
            matrix = _open(path, shape)
            paths.append(path)
            rows = asked if asked is not None else np.flatnonzero(~(matrix > 0).all(axis=1)).tolist()
            flushed = time.monotonic()
            try:
                for row in rows:
                    counts = guess_counts(solver, how, solver.guesses[row], cache)
                    matrix[row] = 0  # a stop mid-write leaves zeros, never a mix of old and new
                    matrix[row] = counts  # int16 -> uint8, 1..13
                    if after_row is not None:
                        after_row(how, row)
                    if time.monotonic() - flushed >= FLUSH_SECONDS:
                        matrix.flush()
                        flushed = time.monotonic()
            finally:
                matrix.flush()
                del matrix
    except KeyboardInterrupt:
        interrupted = True
    paths.extend(write_summary(out, solver))
    if interrupted:
        raise KeyboardInterrupt
    return paths
