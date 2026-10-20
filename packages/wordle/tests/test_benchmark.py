import json

import pytest

from wordle.engine.feedback import feedback
from wordle.engine.words import load_word_lists
from wordle.solver import benchmark
from wordle.solver.matrix import CACHE_DIR
from wordle.solver.strategy import STRATEGIES, Solver, pack

SUBSET = list(load_word_lists().answers[::200])  # 12 Answers, enough to exercise the tree


@pytest.fixture(scope="module")
def solver():
    return Solver.load()


@pytest.fixture(scope="module")
def results(solver):
    """The Benchmark of each Strategy on the subset, run once."""
    return {how.id: benchmark.run_benchmark(solver, how, SUBSET) for how in STRATEGIES}


def play_alone(solver, how, opener, answer):
    """One Game, the slow way: the Guess Count of `answer`."""
    candidates, guess, number = solver.all_candidates(), opener, 1
    while (code := pack(feedback(guess, answer))) != 242:
        candidates = solver.narrow(candidates, guess, code)
        guess = solver.suggest(candidates, pool=how.pool, scope=how.scope, by=how.by).word
        number += 1
    return number


def test_files_go_in_the_shared_cache():
    assert benchmark.BENCHMARK_DIR == CACHE_DIR / "benchmark"


@pytest.mark.parametrize("how", STRATEGIES, ids=lambda how: how.id)
def test_tree_play_matches_playing_each_game(solver, results, how):
    result = results[how.id]
    alone = [play_alone(solver, how, result["opener"], answer) for answer in SUBSET]
    assert result["games"] == len(SUBSET)
    assert result["distribution"] == [alone.count(k) for k in range(1, 7)]
    assert result["losses"] == sum(n > 6 for n in alone)
    assert result["opener"] == solver.rank(solver.all_candidates(), pool=how.pool, scope=how.scope, by=how.by, top=1)[0].word


def test_average_is_over_won_games(results):
    result = results["bits-all"]
    won = sum(result["distribution"])
    assert won + result["losses"] == len(SUBSET)
    assert result["average_guess_count"] == pytest.approx(sum(k * n for k, n in enumerate(result["distribution"], 1)) / won)


def test_openers_ranked_by_bits(solver):
    openers = benchmark.opener_leaderboard(solver, 10)
    assert [o["rank"] for o in openers] == list(range(1, 11))
    bits = [o["bits"] for o in openers]
    assert bits == sorted(bits, reverse=True)
    assert "raise" in {o["word"] for o in benchmark.opener_leaderboard(solver, 50)}


def test_save_and_load_round_trip(solver, results, tmp_path):
    result = results["bits-candidates"]
    benchmark.save([result], benchmark.opener_leaderboard(solver, 3), tmp_path)
    saved, openers = benchmark.load(tmp_path)
    assert saved == {"guess_limit": 6, "strategies": [json.loads(json.dumps(result))]}
    assert len(openers["openers"]) == 3
    assert benchmark.load(tmp_path / "nothing") == (None, None)
