"""Migrate a version 1 Guess Count Matrix folder to version 2, without playing anything again.

Version 1 kept four flat files, `<old id>.npy` for `bits-candidates`, `expected-candidates`, `bits-all` and
`expected-all`, each with all 14,855 Guess List rows, plus `<old id>.ranking.csv`, `summary.json` and a
`manifest.json` whose `rows` is one list. Each becomes one or two version 2 matrices:

  - `<ranking>-candidates.npy` -> `<ranking>/guesses-candidates.npy` (every row), and its Answer List rows
    -> `<ranking>/answers-candidates.npy` (an Answers matrix is the Answer List rows of the Guesses one);
  - `<ranking>-all.npy` -> `<ranking>/guesses-all.npy`.

Rows are copied as they are, zero (unfinished) rows included, so a partial matrix stays resumable. The new
matrices are written first, then the version 2 manifest, `summary.json` and ranking CSVs, and only then are
the version 1 matrices and CSVs removed.
"""

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from wordle.solver.guess_count_matrix import (
    FORMAT_VERSION,
    MANIFEST_FILE,
    SUBDIR,
    _manifest,
    _write_manifest,
    matrix_path,
    write_summary,
)
from wordle.solver.guess_counts import SAFETY_LIMIT
from wordle.solver.strategy import STRATEGIES, Solver, Strategy

OLD_VERSION = 1
BY_ID = {how.id: how for how in STRATEGIES}


@dataclass(frozen=True)
class OldMatrix:
    """One version 1 matrix: its id, its definition as version 1 wrote it, and the version 2 Strategies it becomes."""

    id: str
    pool: str
    scope: str
    by: str
    guesses: Strategy
    """Takes every row."""
    answers: Strategy | None
    """Takes the Answer List rows, for a Candidates-only matrix."""


OLD_MATRICES = tuple(
    OldMatrix(
        f"{by}-{scope}",
        "answers" if scope == "candidates" else "guesses",
        "candidates" if scope == "candidates" else "global",
        by,
        BY_ID[f"{by}-guesses-{scope}"],
        BY_ID[f"{by}-answers-candidates"] if scope == "candidates" else None,
    )
    for by in ("bits", "expected")
    for scope in ("candidates", "all")
)


class MigrationRefused(Exception):
    """The folder can't be migrated: it is not version 1, or its word lists or matrices are not the current ones."""


def old_matrix_path(out: Path, old: OldMatrix) -> Path:
    return out / SUBDIR / f"{old.id}.npy"


def old_ranking_path(out: Path, old: OldMatrix) -> Path:
    return out / SUBDIR / f"{old.id}.ranking.csv"


def plan(out: Path, solver: Solver) -> list[OldMatrix]:
    """The version 1 matrices in `out` to migrate; raises `MigrationRefused` with the reason if the folder can't be."""
    manifest = _manifest(out)
    folder = out / SUBDIR
    if manifest is None:
        raise MigrationRefused(f"there is no {MANIFEST_FILE} in {folder}")
    version = manifest.get("format_version")
    if version == FORMAT_VERSION:
        raise MigrationRefused(f"{folder} is already format version {FORMAT_VERSION}")
    if version != OLD_VERSION:
        raise MigrationRefused(f"{MANIFEST_FILE} was written by format version {version}, not {OLD_VERSION}")
    if manifest.get("safety_limit") != SAFETY_LIMIT:
        raise MigrationRefused(f"the safety limit in {MANIFEST_FILE} is not {SAFETY_LIMIT}")
    if manifest.get("rows") != list(solver.guesses) or manifest.get("columns") != list(solver.answers):
        raise MigrationRefused(f"the word lists in {MANIFEST_FILE} differ from the current ones")
    shape = (len(solver.guesses), len(solver.answers))
    found = []
    for old in OLD_MATRICES:
        path = old_matrix_path(out, old)
        if not path.exists():
            continue
        entry = manifest.get("strategies", {}).get(old.id) or {}
        if (entry.get("pool"), entry.get("scope"), entry.get("ranked_by")) != (old.pool, old.scope, old.by):
            raise MigrationRefused(f"{old.id} is not defined in {MANIFEST_FILE} as version 1 defined it")
        matrix = np.load(path, mmap_mode="r")
        if matrix.shape != shape or matrix.dtype != np.uint8:
            raise MigrationRefused(f"{path.name} is {matrix.dtype} {matrix.shape}, not uint8 {shape}")
        found.append(old)
    if not found:
        raise MigrationRefused(f"there is no version 1 matrix in {folder}")
    return found


def targets(old_matrices: list[OldMatrix]) -> tuple[Strategy, ...]:
    """The version 2 Strategies the version 1 matrices become."""
    return tuple(how for old in old_matrices for how in (old.guesses, old.answers) if how is not None)


def _save(path: Path, matrix: np.ndarray) -> None:
    """Write `matrix` to `path` through a temporary file, so a stop never leaves half a matrix."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp.npy")
    np.save(tmp, np.ascontiguousarray(matrix))
    tmp.replace(path)


def migrate(out: Path, solver: Solver) -> list[Path]:
    """Turn the version 1 folder in `out` into version 2; returns the files written, the summary last.

    Raises `MigrationRefused` before writing anything if `plan` finds a reason.
    """
    old_matrices = plan(out, solver)
    answer_rows = [solver.guesses.index(word) for word in solver.answers]
    paths = []
    for old in old_matrices:
        matrix = np.load(old_matrix_path(out, old), mmap_mode="r")
        _save(matrix_path(out, old.guesses), matrix)
        paths.append(matrix_path(out, old.guesses))
        if old.answers is not None:
            _save(matrix_path(out, old.answers), matrix[answer_rows])
            paths.append(matrix_path(out, old.answers))
        del matrix
    _write_manifest(out, targets(old_matrices), solver)  # the version 1 entries are dropped: its word lists differ
    paths.extend(write_summary(out, solver))
    for old in old_matrices:
        old_matrix_path(out, old).unlink()
        old_ranking_path(out, old).unlink(missing_ok=True)
    return paths
