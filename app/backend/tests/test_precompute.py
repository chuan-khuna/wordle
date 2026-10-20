import sys

import numpy as np

from wordle.solver.matrix import ANSWERS_FILE, DEFAULT_DIR, GUESSES_FILE
from wordle_backend import benchmark, precompute
from wordle_backend.solver import WebSolver


def test_default_dir_is_the_shared_cache():
    assert DEFAULT_DIR.parts[-2:] == ("precompute-cache", "feedback")
    assert benchmark.BENCHMARK_DIR.parts[-2:] == ("precompute-cache", "benchmark")


def test_precompute_writes_the_matrices_the_solver_loads(tmp_path, monkeypatch):
    monkeypatch.setattr(sys, "argv", ["precompute", "--out", str(tmp_path), "--threads", "2", "--yes", "--skip-benchmark"])
    precompute.main()
    assert sorted(p.name for p in (tmp_path / "feedback").iterdir()) == [ANSWERS_FILE, GUESSES_FILE]
    solver = WebSolver.load(tmp_path / "feedback")
    assert len(solver.all_candidates()) == 2315
    assert solver.rank(solver.all_candidates(), top=1)[0].word == "tarse"
    assert np.array_equal(np.load(tmp_path / "feedback" / ANSWERS_FILE), np.load(DEFAULT_DIR / ANSWERS_FILE))
