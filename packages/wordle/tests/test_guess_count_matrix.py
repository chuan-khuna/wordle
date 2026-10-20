import json

import numpy as np
import pytest

from wordle.engine.feedback import feedback
from wordle.solver.guess_count_matrix import build, matrix_path, summarize
from wordle.solver.guess_counts import UNSOLVED
from wordle.solver.matrix import WIN
from wordle.solver.strategy import STRATEGIES, Solver, pack

SUBSET = np.arange(0, 2315, 200)  # 12 Answers, enough to exercise the tree


@pytest.fixture(scope="module")
def solver() -> Solver:
    return Solver.load()


def play_alone(solver, how, opener, answer):
    """One Game, the slow way: the Guess Count of `answer`."""
    candidates, guess, number = solver.all_candidates(), opener, 1
    while (code := pack(feedback(guess, answer))) != WIN:
        candidates = solver.narrow(candidates, guess, code)
        guess = solver.suggest(candidates, pool=how.pool, scope=how.scope, by=how.by).word
        number += 1
    return number


@pytest.mark.parametrize("how", STRATEGIES, ids=lambda how: how.id)
def test_filled_rows_match_playing_each_game(solver, tmp_path, how):
    openers = ["raise"] if how.scope == "global" else ["raise", "salet"]
    build(tmp_path, (how,), openers, solver)

    matrix = np.load(matrix_path(tmp_path, how))
    assert matrix.shape == (len(solver.guesses), len(solver.answers))
    assert matrix.dtype == np.uint8
    for opener in openers:
        row = matrix[solver.guesses.index(opener)]
        for i in SUBSET:
            assert row[i] == play_alone(solver, how, opener, solver.answers[i])
    asked = {solver.guesses.index(word) for word in openers}
    for r in np.flatnonzero(matrix.any(axis=1)):
        assert r in asked  # every other row is still zero


def test_summary_lists_the_filled_openers(solver, tmp_path):
    build(tmp_path, STRATEGIES[:1], ["salet", "raise"], solver)
    summary = json.loads((tmp_path / "guess-counts" / "summary.json").read_text())
    entry = summary["bits-candidates"]
    assert entry["complete_rows"] == 2
    assert [o["rank"] for o in entry["openers"]] == [1, 2]
    assert {o["word"] for o in entry["openers"]} == {"salet", "raise"}


WORDS = ("aaaaa", "bbbbb", "ccccc", "ddddd", "eeeee")


def test_summary_ranking_and_counts():
    # Three Answers; the last row is unfinished (a zero) and must be left out.
    matrix = np.array(
        [
            [3, 3, 3],  # average 3.0
            [2, 4, 3],  # average 3.0, ties with aaaaa and ddddd
            [1, 7, 4],  # a Loss; average 4.0
            [3, 3, 3],  # average 3.0
            [2, 2, 0],
        ],
        dtype=np.uint8,
    )
    bits = {"aaaaa": 4.0, "bbbbb": 5.0, "ccccc": 9.0, "ddddd": 4.0}
    entries = summarize(matrix, WORDS, bits, frozenset({"bbbbb", "ccccc"}))

    # Same average: higher bits first (bbbbb), then alphabetical (aaaaa before ddddd).
    assert [e["word"] for e in entries] == ["bbbbb", "aaaaa", "ddddd", "ccccc"]
    assert [e["rank"] for e in entries] == [1, 2, 3, 4]
    worst = entries[-1]
    assert worst["average_guess_count"] == pytest.approx(4.0)
    assert worst["losses"] == 1
    assert worst["distribution"] == [1, 0, 0, 1, 0, 0]  # the 7 is a Loss, not in 1..6
    assert worst["bits"] == 9.0
    assert worst["is_answer"] is True and entries[1]["is_answer"] is False
    assert entries[0]["distribution"] == [0, 1, 1, 1, 0, 0]


def test_unsolved_counts_as_a_loss():
    matrix = np.array([[1, UNSOLVED]], dtype=np.uint8)
    (entry,) = summarize(matrix, ("aaaaa",), {"aaaaa": 1.0}, frozenset())
    assert entry["losses"] == 1
    assert entry["average_guess_count"] == pytest.approx(7.0)
