import json

import pytest

from wordle.engine.feedback import feedback
from wordle.engine.words import load_word_lists
from wordle.solver.strategy import pack
from wordle_backend import benchmark
from wordle_backend.solver import DEFAULT_DIR, WebSolver

SUBSET = list(load_word_lists().answers[::200])  # 12 Answers, enough to exercise the tree


@pytest.fixture(scope="module")
def strategy():
    return WebSolver.load(DEFAULT_DIR)


@pytest.fixture(scope="module")
def results(strategy):
    """The Benchmark of each Strategy on the subset, run once."""
    return {how.id: benchmark.run_benchmark(strategy, how, SUBSET) for how in benchmark.BENCHMARK_STRATEGIES}


def play_alone(strategy, how, opener, answer):
    """One Game, the slow way: the Guess Count of `answer`."""
    candidates, guess, number = strategy.all_candidates(), opener, 1
    while (code := pack(feedback(guess, answer))) != 242:
        candidates = strategy.narrow(candidates, guess, code)
        guess = strategy.rank(candidates, pool=how.pool, scope=how.scope, by=how.by, top=1)[0].word
        number += 1
    return number


@pytest.mark.parametrize("how", benchmark.BENCHMARK_STRATEGIES, ids=lambda how: how.id)
def test_tree_play_matches_playing_each_game(strategy, results, how):
    result = results[how.id]
    alone = [play_alone(strategy, how, result["opener"], answer) for answer in SUBSET]
    assert result["games"] == len(SUBSET)
    assert result["distribution"] == [alone.count(k) for k in range(1, 7)]
    assert result["losses"] == sum(n > 6 for n in alone)
    assert result["opener"] == strategy.rank(strategy.all_candidates(), pool=how.pool, scope=how.scope, by=how.by, top=1)[0].word


def test_average_is_over_won_games(results):
    result = results["bits-all"]
    won = sum(result["distribution"])
    assert won + result["losses"] == len(SUBSET)
    assert result["average_guess_count"] == pytest.approx(sum(k * n for k, n in enumerate(result["distribution"], 1)) / won)


def test_openers_ranked_by_bits(strategy):
    openers = benchmark.opener_leaderboard(strategy, 10)
    assert [o["rank"] for o in openers] == list(range(1, 11))
    bits = [o["bits"] for o in openers]
    assert bits == sorted(bits, reverse=True)
    assert "raise" in {o["word"] for o in benchmark.opener_leaderboard(strategy, 50)}


def test_save_and_load_round_trip(strategy, results, tmp_path):
    result = results["bits-candidates"]
    benchmark.save([result], benchmark.opener_leaderboard(strategy, 3), tmp_path)
    saved, openers = benchmark.load(tmp_path)
    assert saved == {"guess_limit": 6, "strategies": [json.loads(json.dumps(result))]}
    assert len(openers["openers"]) == 3
    assert benchmark.load(tmp_path / "nothing") == (None, None)


# The API reads the files precompute wrote; these tests write small ones of their own.


@pytest.fixture(scope="module")
def served(client, strategy, results):
    """The client with a one-Strategy Benchmark and three Openers in place of the real files."""
    state = client.app.state
    before = state.benchmark, state.openers
    state.benchmark = {"guess_limit": 6, "strategies": [results["bits-all"]]}
    state.openers = {"openers": benchmark.opener_leaderboard(strategy, 3)}
    yield client
    state.benchmark, state.openers = before


def test_benchmark_endpoint_shape(served):
    body = served.get("/api/benchmark").json()
    assert body["guess_limit"] == 6
    (entry,) = body["strategies"]
    assert set(entry) == {"id", "name", "pool", "scope", "by", "opener", "games", "distribution", "losses", "lost_answers", "average_guess_count"}
    assert len(entry["distribution"]) == 6 and entry["games"] == len(SUBSET)


def test_openers_endpoint_top(served):
    body = served.get("/api/openers", params={"top": 2}).json()
    assert body["total"] == 3 and [o["rank"] for o in body["openers"]] == [1, 2]
    assert set(body["openers"][0]) == {"rank", "word", "bits", "expected_candidates", "groups", "largest_group", "is_candidate"}
    assert len(served.get("/api/openers").json()["openers"]) == 3


@pytest.mark.parametrize("top", ["0", "-1", "abc"])
def test_openers_bad_top_is_400(served, top):
    response = served.get("/api/openers", params={"top": top})
    assert response.status_code == 400 and response.json()["detail"]


def test_missing_files_are_503_and_the_rest_still_works(client):
    state = client.app.state
    before = state.benchmark, state.openers
    state.benchmark = state.openers = None
    try:
        for url in ("/api/benchmark", "/api/openers"):
            response = client.get(url)
            assert response.status_code == 503 and "just backend-precompute" in response.json()["detail"]
        assert client.get("/api/feedback", params={"guess": "crane", "answer": "crane"}).status_code == 200
    finally:
        state.benchmark, state.openers = before
