import numpy as np
import pytest

from wordle.engine.feedback import feedback
from wordle.engine.words import WordLists
from wordle.solver.guess_counts import UNSOLVED, NextGuessCache, guess_counts
from wordle.solver.matrix import WIN
from wordle.solver.strategy import STRATEGIES, Solver, pack

SUBSET = np.arange(0, 2315, 200)  # 12 Answers, enough to exercise the tree
OPENER = "raise"


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
def test_tree_play_matches_playing_each_game(solver, how):
    counts = guess_counts(solver, how, OPENER)
    assert counts.shape == (len(solver.answers),)
    for i in SUBSET:
        assert counts[i] == play_alone(solver, how, OPENER, solver.answers[i])


def test_the_opener_is_the_first_guess(solver):
    how = STRATEGIES[0]
    counts = guess_counts(solver, how, "crane")
    assert counts[solver.answers.index("crane")] == 1
    assert counts.min() == 1 and (counts == 1).sum() == 1


@pytest.mark.parametrize("how", (STRATEGIES[1], STRATEGIES[2]), ids=lambda how: how.id)
def test_a_shared_cache_changes_nothing(solver, how):
    cache = NextGuessCache()
    for opener in ("raise", "crane", "slate"):
        assert np.array_equal(guess_counts(solver, how, opener, cache), guess_counts(solver, how, opener))
    filled = len(cache)
    assert filled > 0
    guess_counts(solver, how, "raise", cache)  # a repeat finds everything cached
    assert len(cache) == filled


def test_the_safety_limit_stops_a_runaway():
    # Every Guess gets the same Feedback (not a Win), so no Game ever ends.
    answers = ("cable", "crane", "crate")
    lists = WordLists(answers=answers, guesses=frozenset(answers))
    never = np.zeros((3, 3), dtype=np.uint8)
    stuck = Solver(never, never, lists)
    counts = guess_counts(stuck, STRATEGIES[0], "cable")
    assert (counts == UNSOLVED).all()
