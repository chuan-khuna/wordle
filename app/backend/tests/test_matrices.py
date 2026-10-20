import shutil
import subprocess
from pathlib import Path

import numpy as np
import pytest

from wordle_backend.feedback import feedback, pack
from wordle_backend.matrices import ANSWERS_FILE, GUESSES_FILE, build
from wordle_backend.words import load_word_lists

REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="module")
def built(tmp_path_factory) -> Path:
    directory = tmp_path_factory.mktemp("matrices")
    build(directory, threads=4)
    return directory


def test_shapes_and_dtype(built):
    words = load_word_lists()
    answers_vs_answers = np.load(built / ANSWERS_FILE)
    guesses_vs_answers = np.load(built / GUESSES_FILE)
    assert answers_vs_answers.shape == (len(words.answers), len(words.answers))
    assert guesses_vs_answers.shape == (len(words.guesses), len(words.answers))
    assert guesses_vs_answers.dtype == np.uint8


def test_cells_agree_with_feedback(built):
    words = load_word_lists()
    guesses_vs_answers = np.load(built / GUESSES_FILE, mmap_mode="r")
    answers_vs_answers = np.load(built / ANSWERS_FILE, mmap_mode="r")
    rng = np.random.default_rng(0)
    for _ in range(3000):
        g = int(rng.integers(len(words.guesses)))
        a = int(rng.integers(len(words.answers)))
        assert guesses_vs_answers[g, a] == pack(feedback(words.guesses[g], words.answers[a]))
    for a in range(0, len(words.answers), 37):
        for b in range(0, len(words.answers), 41):
            assert answers_vs_answers[a, b] == pack(feedback(words.answers[a], words.answers[b]))


def test_threads_do_not_change_the_output(built, tmp_path):
    build(tmp_path, threads=1)
    for name in (ANSWERS_FILE, GUESSES_FILE):
        assert (tmp_path / name).read_bytes() == (built / name).read_bytes()


def test_byte_identical_to_the_python_package(built, tmp_path):
    """Build the reference with `src/precompute.py` from the root workspace and compare bytes."""
    if shutil.which("uv") is None:
        pytest.skip("uv is not on PATH, so the reference matrices cannot be built")
    result = subprocess.run(
        ["uv", "run", "src/precompute.py", "--out", str(tmp_path), "--threads", "1", "--yes"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.skip(f"could not build the reference with packages/wordle: {result.stderr.strip()[-300:]}")
    for name in (ANSWERS_FILE, GUESSES_FILE):
        assert (built / name).read_bytes() == (tmp_path / name).read_bytes()
