import math
from collections import Counter

import numpy as np
import pytest

from wordle.engine.feedback import feedback
from wordle.engine.game import State
from wordle.engine.words import WordLists
from wordle.solver.strategy import Solver, pack
from wordle.solver.matrix import WIN, score_matrix

ANSWERS = ("cable", "crane", "crate", "grate", "irate", "plate", "slate", "trace")
EXTRA = ("lerot", "salet", "zzzzz")


@pytest.fixture(scope="module")
def solver() -> Solver:
    lists = WordLists(answers=ANSWERS, guesses=frozenset(ANSWERS + EXTRA))
    guesses = tuple(sorted(lists.guesses))
    return Solver(score_matrix(ANSWERS, ANSWERS), score_matrix(guesses, ANSWERS), lists)


def brute_force(word: str, answers) -> tuple[float, float]:
    """(bits, expected Candidates) worked out the slow way, with `feedback`."""
    counts = Counter(feedback(word, answer) for answer in answers)
    n = len(answers)
    bits = sum(c / n * math.log2(n / c) for c in counts.values())
    return bits, sum(c * c for c in counts.values()) / n


def test_stats_match_brute_force(solver):
    candidates = solver.all_candidates()
    for word in ANSWERS + EXTRA:
        stats = solver.stats(word, candidates)
        bits, expected = brute_force(word, ANSWERS)
        assert stats.bits == pytest.approx(bits)
        assert stats.expected_candidates == pytest.approx(expected)


def test_a_word_that_splits_nothing_has_zero_bits(solver):
    stats = solver.stats("zzzzz", solver.all_candidates())
    assert stats.bits == pytest.approx(0)
    assert stats.expected_candidates == len(ANSWERS)
    assert stats.groups == 1 and not stats.is_candidate


def test_candidates_follow_the_state(solver):
    state = State().add("crane", feedback("crane", "grate"))
    words = solver.words(solver.candidates(state))
    assert "grate" in words
    assert all(feedback("crane", w) == feedback("crane", "grate") for w in words)
    assert set(words) == {w for w in ANSWERS if feedback("crane", w) == feedback("crane", "grate")}


def test_rank_is_best_first(solver):
    ranked = solver.rank(solver.all_candidates(), top=None)
    assert len(ranked) == len(ANSWERS + EXTRA)
    assert [s.bits for s in ranked] == sorted((s.bits for s in ranked), reverse=True)
    by_expected = solver.rank(solver.all_candidates(), by="expected", top=None)
    values = [s.expected_candidates for s in by_expected]
    assert values == sorted(values)


def test_candidate_scope_only_offers_candidates(solver):
    candidates = solver.narrow(solver.all_candidates(), "crane", pack(feedback("crane", "grate")))
    for pool in ("answers", "guesses"):
        ranked = solver.rank(candidates, pool=pool, scope="candidates", top=None)
        assert {s.word for s in ranked} == set(solver.words(candidates))
        assert all(s.is_candidate for s in ranked)


def test_answer_pool_never_offers_extra_words(solver):
    ranked = solver.rank(solver.all_candidates(), pool="answers", scope="global", top=None)
    assert {s.word for s in ranked} == set(ANSWERS)


def test_both_pools_agree_on_candidates(solver):
    candidates = solver.all_candidates()[:5]
    a = solver.rank(candidates, pool="answers", scope="candidates", top=None)
    g = solver.rank(candidates, pool="guesses", scope="candidates", top=None)
    assert a == g


def test_last_candidate_is_suggested(solver):
    candidates = np.array([ANSWERS.index("plate")])
    best = solver.suggest(candidates)
    assert best.word == "plate" and best.win_chance == 1


def test_split_groups_every_candidate(solver):
    split = solver.split("crane", solver.all_candidates())
    assert sorted(w for group in split.values() for w in group) == sorted(ANSWERS)
    assert split[WIN] == ["crane"]


def test_stats_refuses_unknown_words(solver):
    with pytest.raises(ValueError):
        solver.stats("qwxyz", solver.all_candidates())
