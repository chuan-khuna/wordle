"""Tests for `src/precompute_backup.py` (`just backup-cache` and `just restore-cache`), on small temporary folders."""

import argparse
import importlib.util
import json
from pathlib import Path

import numpy as np
import pytest

from wordle.solver.guess_count_matrix import folder_mismatch, matrix_path
from wordle.solver.guess_count_migration import migrate
from wordle.solver.strategy import STRATEGIES, Solver

SCRIPT = Path(__file__).resolve().parent.parent / "src" / "precompute_backup.py"
BY_ID = {how.id: how for how in STRATEGIES}


@pytest.fixture
def backup_module(tmp_path, monkeypatch):
    """`precompute_backup`, with its cache and backup folders moved under `tmp_path`."""
    spec = importlib.util.spec_from_file_location("precompute_backup", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module, "ROOT", tmp_path)
    monkeypatch.setattr(module, "CACHE_DIR", tmp_path / "precompute-cache")
    monkeypatch.setattr(module, "BACKUP_DIR", tmp_path / "data" / "precompute")
    return module


def args(**kwargs) -> argparse.Namespace:
    return argparse.Namespace(**({"folder": None, "yes": True, "partial": False} | kwargs))


def tree(folder: Path) -> dict[str, bytes]:
    return {str(p.relative_to(folder)): p.read_bytes() for p in sorted(folder.rglob("*")) if p.is_file()}


def write_version_2_folder(cache: Path, complete: int = 2) -> None:
    """A tiny version 2 guess-counts/ folder: two Pools of 2 and 3 words, with files in bits/ and expected/."""
    folder = cache / "guess-counts"
    for sub in ("bits", "expected"):
        (folder / sub).mkdir(parents=True)
        np.save(folder / sub / "answers-candidates.npy", np.full((2, 2), 3, dtype=np.uint8))
        (folder / sub / "answers-candidates.ranking.csv").write_text("rank,opener\n1,aaaaa\n")
    manifest = {
        "format_version": 2,
        "strategies": {
            "bits-answers-candidates": {"pool": "answers", "path": "bits/answers-candidates.npy"},
            "expected-answers-candidates": {"pool": "answers", "path": "expected/answers-candidates.npy"},
        },
        "rows": {"answers": ["aaaaa", "bbbbb"], "guesses": ["aaaaa", "bbbbb", "ccccc"]},
        "columns": ["aaaaa", "bbbbb"],
    }
    summary = {
        "bits-answers-candidates": {"complete_rows": complete},
        "expected-answers-candidates": {"complete_rows": 2},
    }
    (folder / "manifest.json").write_text(json.dumps(manifest))
    (folder / "summary.json").write_text(json.dumps(summary))
    (cache / "feedback").mkdir()
    (cache / "feedback" / "answers_vs_answers.npy").write_bytes(b"not backed up")


def test_backup_and_restore_round_trip_with_subfolders(backup_module, tmp_path):
    cache, backup_dir = tmp_path / "precompute-cache", tmp_path / "data" / "precompute"
    write_version_2_folder(cache)
    before = tree(cache / "guess-counts")

    backup_module.backup(args())
    assert set(tree(backup_dir)) == {
        "guess-counts/manifest.json.xz",
        "guess-counts/summary.json.xz",
        "guess-counts/bits/answers-candidates.npy.xz",
        "guess-counts/bits/answers-candidates.ranking.csv.xz",
        "guess-counts/expected/answers-candidates.npy.xz",
        "guess-counts/expected/answers-candidates.ranking.csv.xz",
    }  # no feedback/

    (cache / "guess-counts" / "bits" / "stale.npy").write_bytes(b"from a half-built run")
    backup_module.restore(args())
    assert tree(cache / "guess-counts") == before


def test_backup_of_an_unfinished_version_2_matrix_needs_partial(backup_module, tmp_path):
    cache = tmp_path / "precompute-cache"
    write_version_2_folder(cache, complete=1)
    assert backup_module.unfinished(cache / "guess-counts") == ["bits-answers-candidates: 1 of 2 Openers complete"]
    with pytest.raises(SystemExit, match="not finished"):
        backup_module.backup(args())
    backup_module.backup(args(partial=True))
    assert (tmp_path / "data" / "precompute" / "guess-counts" / "bits" / "answers-candidates.npy.xz").exists()


def test_a_version_1_backup_restores_then_migrates_to_version_2(backup_module, tmp_path):
    solver = Solver.load()
    folder = tmp_path / "precompute-cache" / "guess-counts"
    folder.mkdir(parents=True)
    old = np.zeros((len(solver.guesses), len(solver.answers)), dtype=np.uint8)
    old[solver.guesses.index("raise")] = 4
    np.save(folder / "bits-candidates.npy", old)
    manifest = {
        "format_version": 1,
        "safety_limit": 12,
        "strategies": {"bits-candidates": {"pool": "answers", "scope": "candidates", "ranked_by": "bits"}},
        "rows": list(solver.guesses),
        "columns": list(solver.answers),
    }
    (folder / "manifest.json").write_text(json.dumps(manifest))
    (folder / "summary.json").write_text(json.dumps({"bits-candidates": {"complete_rows": 1}}))
    assert backup_module.unfinished(folder) == ["bits-candidates: 1 of 14,855 Openers complete"]  # version 1 rows
    backup_module.backup(args(partial=True))
    for path in folder.iterdir():
        path.unlink()

    backup_module.restore(args())
    assert np.load(folder / "bits-candidates.npy").tobytes() == old.tobytes()
    migrate(tmp_path / "precompute-cache", solver)
    assert folder_mismatch(tmp_path / "precompute-cache") is None
    answers = np.load(matrix_path(tmp_path / "precompute-cache", BY_ID["bits-answers-candidates"]))
    assert answers[solver.answers.index("raise")].tolist() == [4] * len(solver.answers)
    assert not (folder / "bits-candidates.npy").exists()
