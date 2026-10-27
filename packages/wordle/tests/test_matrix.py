import random
from pathlib import Path

import numpy as np

from wordle.engine.feedback import feedback
from wordle.engine.words import load_word_lists
from wordle.solver.matrix import WIN, score_matrix


def pack(marks) -> int:
    code = 0
    for mark in marks:
        code = code * 3 + mark.value
    return code


def test_matches_feedback_on_tricky_words():
    words = ("speed", "abide", "lllll", "hello", "eerie", "crane", "bbaaa", "aabbb", "cable")
    matrix = score_matrix(words, words)
    for g, guess in enumerate(words):
        for a, answer in enumerate(words):
            assert matrix[g, a] == pack(feedback(guess, answer)), (guess, answer)


def test_matches_feedback_on_random_pairs():
    lists = load_word_lists()
    rng = random.Random(0)
    guesses = tuple(rng.sample(sorted(lists.guesses), 300))
    answers = tuple(rng.sample(lists.answers, 300))
    matrix = score_matrix(guesses, answers)
    for g, guess in enumerate(guesses):
        for a, answer in enumerate(answers):
            assert matrix[g, a] == pack(feedback(guess, answer))


def test_a_word_against_itself_is_a_win():
    answers = load_word_lists().answers[:50]
    matrix = score_matrix(answers, answers)
    assert all(matrix[i, i] == WIN for i in range(len(answers)))


def test_threads_give_the_same_matrix():
    lists = load_word_lists()
    guesses = tuple(sorted(lists.guesses))[:700]  # several chunks
    answers = lists.answers[:100]
    assert (score_matrix(guesses, answers, threads=4) == score_matrix(guesses, answers)).all()


REPO = Path(__file__).resolve().parents[3]
# The header of a 14,855 x 2,315 uint8 `.npy`, as the gpui app's `npy_bytes` writes it
# (pinned in app/wordle-gpui/src/solver/matrix_tests.rs too), so both tools write the same file.
NPY_HEADER = (
    b"\x93NUMPY\x01\x00\x76\x00{'descr': '|u1', 'fortran_order': False, 'shape': (14855, 2315), }"
    + b" " * 51
    + b"\n"
)


def test_npy_header_is_the_one_the_gpui_app_writes(tmp_path):
    saved = tmp_path / "saved.npy"
    np.save(saved, np.zeros((14855, 2315), dtype=np.uint8))
    mapped = np.lib.format.open_memmap(tmp_path / "mapped.npy", mode="w+", dtype=np.uint8, shape=(14855, 2315))
    del mapped
    for path in (saved, tmp_path / "mapped.npy"):
        assert path.read_bytes()[:128] == NPY_HEADER, path.name


def test_the_gpui_app_has_the_same_word_lists():
    # Rows and columns are these lists sorted, so a different copy would shift every cell.
    for name in ("answers.txt", "guesses.txt"):
        package = REPO / "packages/wordle/src/wordle/data" / name
        gpui = REPO / "app/wordle-gpui/data" / name
        assert package.read_bytes() == gpui.read_bytes(), name
