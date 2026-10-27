"""The Guess Count Matrix: how many Guesses every Opener takes to Win every Answer.

One matrix per Strategy, saved as `<out>/guess-counts/<ranking>/<pool>-<scope>.npy`
(`Strategy.path`, such as `bits/answers-candidates.npy`):

  - rows are Openers (the whole Guess Pool of the Strategy) and columns are Answers,
    both sorted as in the Feedback matrices (2,315 or 14,855 x 2,315, `uint8`);
  - a cell is the Guess Count of that Game played to a Win with no Guess Limit
    (13, `UNSOLVED`, if the safety limit was hit), so a Loss keeps its real count;
  - a row of zeros is not filled yet, since no Guess Count is 0.

The file is created at full size and rows are written in place (a memory map),
so a run that fills only some Openers leaves the rest as they were. A row is
written only once its Opener is fully played, after being zeroed, and the map is
flushed every few seconds, so a stop loses at most the rows in flight. A plain
run fills only the rows with a zero cell; asking for Openers plays them again.

`manifest.json` (see ADR 0001, format version 2) records the word lists (`rows`,
one list per Guess Pool, and `columns`) and each Strategy's definition and path,
written before any row. A matrix with rows is resumed only if the manifest matches
the current word lists and Strategy; otherwise `build` raises `ManifestMismatch`
and the caller starts over with `fresh=True`. A folder written by format version 1
(flat `<strategy id>.npy` files, every matrix 14,855 rows) is a mismatch too, to
migrate with `just precompute migrate` rather than read as version 2.

`summary.json` ranks, for each Strategy, every Opener whose row is complete by
its Average Guess Count over all Answers, then by Expected Information as a first
Guess (higher first), then alphabetically. `<ranking>/<pool>-<scope>.ranking.csv`
holds the same entries for a spreadsheet.
"""

import csv
import json
import queue
import threading
import time
from collections.abc import Callable
from pathlib import Path

import numpy as np
from termcolor import colored
from tqdm import tqdm

from wordle.engine.game import MAX_GUESSES as GUESS_LIMIT
from wordle.solver.guess_counts import SAFETY_LIMIT, NextGuessCache, guess_counts
from wordle.solver.matrix import CACHE_DIR
from wordle.solver.strategy import STRATEGIES, Solver, Strategy

SUBDIR = "guess-counts"
SUMMARY_FILE = "summary.json"
MANIFEST_FILE = "manifest.json"
FORMAT_VERSION = 2
MIGRATE_COMMAND = "just precompute migrate"  # turns a version 1 folder into version 2
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
    return out / SUBDIR / how.path


def ranking_path(out: Path, how: Strategy) -> Path:
    return matrix_path(out, how).with_suffix(".ranking.csv")


def _definition(how: Strategy) -> dict:
    return {"name": how.name, "pool": how.pool, "scope": how.scope, "ranked_by": how.by, "path": how.path}


def _rows(solver: Solver) -> dict[str, list[str]]:
    """The rows of each Guess Pool's matrices, as the manifest records them."""
    return {pool: list(solver.pool_words(pool)) for pool in ("answers", "guesses")}


def _manifest(out: Path) -> dict | None:
    path = out / SUBDIR / MANIFEST_FILE
    return json.loads(path.read_text()) if path.exists() else None


def _same_lists(manifest: dict | None, solver: Solver) -> bool:
    return (
        manifest is not None
        and manifest.get("format_version") == FORMAT_VERSION
        and manifest.get("safety_limit") == SAFETY_LIMIT
        and manifest.get("rows") == _rows(solver)
        and manifest.get("columns") == list(solver.answers)
    )


def folder_mismatch(out: Path) -> str | None:
    """Why the folder in `out` can't be used at all (its manifest is another format version), or None."""
    manifest = _manifest(out)
    if manifest is None or manifest.get("format_version") == FORMAT_VERSION:
        return None
    version = manifest.get("format_version")
    if version == 1:
        return f"{MANIFEST_FILE} was written by format version 1; migrate it with `{MIGRATE_COMMAND}`"
    return f"{MANIFEST_FILE} was written by format version {version}, not {FORMAT_VERSION}"


def mismatch(out: Path, how: Strategy, solver: Solver) -> str | None:
    """Why the matrix of `how` in `out` can't be resumed or summarized, or None if the manifest vouches for it."""
    manifest = _manifest(out)
    if manifest is None:
        return f"there is no {MANIFEST_FILE}"
    if reason := folder_mismatch(out):
        return reason
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
        "rows": _rows(solver),
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
    """The ranked entries for every complete row of `matrix`, whose rows are `guesses` (its Guess Pool).

    `bits` has at least those words' Expected Information.
    """
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
    complete = set()
    for how in strategies:
        words = solver.pool_words(how.pool)
        complete.update(words[r] for r in np.flatnonzero((matrices[how.id] > 0).all(axis=1)))
    everyone = solver.all_candidates()
    bits = {word: solver.stats(word, everyone).bits for word in complete}
    answers = frozenset(solver.answers)
    summary = {}
    paths = []
    for how in strategies:
        openers = summarize(matrices[how.id], solver.pool_words(how.pool), bits, answers)
        summary[how.id] = {"id": how.id, "name": how.name, "complete_rows": len(openers), "openers": openers}
        write_ranking(ranking_path(out, how), openers)
        paths.append(ranking_path(out, how))
    path = out / SUBDIR / SUMMARY_FILE
    path.write_text(json.dumps(summary, separators=(",", ":")) + "\n")
    return [*paths, path]


def load_summary(out: Path = CACHE_DIR) -> dict | None:
    """`summary.json` as saved (Strategy id to its entry), or None when it is missing."""
    path = out / SUBDIR / SUMMARY_FILE
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


class _Stopped(Exception):
    """Raised inside a worker's tree play to drop the Opener in flight once the run is stopping."""


def build(
    out: Path = CACHE_DIR,
    strategies: tuple[Strategy, ...] = STRATEGIES,
    openers: list[str] | None = None,
    solver: Solver | None = None,
    fresh: bool = False,
    threads: int = 1,
    progress: bool = False,
    after_row: Callable[[Strategy, int], None] | None = None,
) -> list[Path]:
    """Fill the Guess Count Matrix of each Strategy, then write the manifest-checked summary and ranking CSVs.

    Each matrix has one row per word of the Strategy's Guess Pool. By default only the rows with a
    zero cell are played (a resume). With `openers`, those rows are played again, finished or not;
    an Opener that is not in a Strategy's Guess Pool is skipped for that Strategy. `fresh` clears
    each Strategy's matrix first. Without `fresh`, a folder of another format version, or a matrix
    that already has rows and doesn't match the manifest, raises `ManifestMismatch` before anything is written.

    `threads` workers play the Openers, sharing one Solver (one memory map of the Feedback Matrices)
    and one `NextGuessCache`; the calling thread commits each finished row, so the files are the same
    whatever the thread count. `progress` draws tqdm bars on stderr: one overall, one per worker.
    `after_row(strategy, row)` is called (on the calling thread) once each row is committed.

    Ctrl+C keeps the finished rows, drops the ones in flight, writes the summary and CSVs, then raises
    `KeyboardInterrupt` again. Returns the files written, the summary last.
    """
    if solver is None:
        solver = Solver.load()
    if not fresh:
        if reason := folder_mismatch(out):
            raise ManifestMismatch(reason)
        for how in strategies:
            if filled_rows(out, how) and (reason := mismatch(out, how, solver)):
                raise ManifestMismatch(f"{how.id}: {reason}")
    if fresh:
        for how in strategies:
            matrix_path(out, how).unlink(missing_ok=True)
    _write_manifest(out, strategies, solver)
    paths = [matrix_path(out, how) for how in strategies]
    matrices = {how: _open(matrix_path(out, how), (len(solver.pool_words(how.pool)), len(solver.answers))) for how in strategies}
    jobs, complete = [], 0
    for how, matrix in matrices.items():
        words = solver.pool_words(how.pool)
        unfinished = np.flatnonzero(~(matrix > 0).all(axis=1)).tolist()
        if openers is None:
            jobs.extend((how, row) for row in unfinished)
            complete += len(words) - len(unfinished)
        else:
            row_of = {word: row for row, word in enumerate(words)}
            jobs.extend((how, row) for row in sorted({row_of[word] for word in openers if word in row_of}))
    try:
        _fill(solver, matrices, jobs, complete, threads, progress, after_row)
    except KeyboardInterrupt:
        interrupted = True
    else:
        interrupted = False
    finally:
        for matrix in matrices.values():
            matrix.flush()
        matrices.clear()
    paths.extend(write_summary(out, solver))
    if interrupted:
        raise KeyboardInterrupt
    return paths


def _fill(
    solver: Solver,
    matrices: dict[Strategy, np.ndarray],
    jobs: list[tuple[Strategy, int]],
    complete: int,
    threads: int,
    progress: bool,
    after_row: Callable[[Strategy, int], None] | None,
) -> None:
    """Play every (Strategy, row) of `jobs` on `threads` workers and commit each row on this thread."""
    cache = NextGuessCache()  # the next Guess depends only on the Candidate Set, so every Opener and thread shares it
    todo = iter(jobs)
    take = threading.Lock()
    stop = threading.Event()
    finished: queue.Queue = queue.Queue()  # (Strategy, row, counts), or an exception from a worker
    overall = tqdm(
        total=complete + len(jobs), initial=complete, desc=colored("Openers", "yellow"), unit="row", position=0,
        dynamic_ncols=True, disable=not progress,
    )  # fmt: skip

    def work(slot: int) -> None:
        bar = tqdm(
            total=len(solver.answers), position=slot + 1, unit="answer", leave=False,
            dynamic_ncols=True, disable=not progress,
        )  # fmt: skip

        def settled(n: int) -> None:
            if stop.is_set():
                raise _Stopped
            bar.update(n)

        try:
            while not stop.is_set():
                with take:
                    job = next(todo, None)
                if job is None:
                    return
                how, row = job
                opener = solver.pool_words(how.pool)[row]
                bar.set_description(f"{how.id} {opener}", refresh=False)
                bar.reset()
                finished.put((how, row, guess_counts(solver, how, opener, cache, settled)))
        except _Stopped:
            pass
        except BaseException as error:  # handed to the calling thread, which re-raises it
            finished.put(error)
        finally:
            bar.close()

    workers = [threading.Thread(target=work, args=(slot,), daemon=True) for slot in range(min(threads, len(jobs)))]
    for worker in workers:
        worker.start()
    flushed = time.monotonic()
    try:
        for _ in range(len(jobs)):
            item = _next(finished)
            if isinstance(item, BaseException):
                raise item
            how, row, counts = item
            matrix = matrices[how]
            matrix[row] = 0  # a stop mid-write leaves zeros, never a mix of old and new
            matrix[row] = counts  # int16 -> uint8, 1..13
            overall.update(1)
            if after_row is not None:
                after_row(how, row)
            if time.monotonic() - flushed >= FLUSH_SECONDS:
                for m in matrices.values():
                    m.flush()
                flushed = time.monotonic()
    finally:
        stop.set()
        for worker in workers:
            worker.join()
        overall.close()


def _next(finished: queue.Queue):
    """The next item from the workers, waking up often so Ctrl+C is seen at once."""
    while True:
        try:
            return finished.get(timeout=0.2)
        except queue.Empty:
            continue
