from concurrent.futures import ThreadPoolExecutor

import pytest

from wordle.engine.words import load_word_lists
from wordle.solver import benchmark
from wordle.solver.strategy import STRATEGIES

SUBSET = list(load_word_lists().answers[::200])  # 12 Answers

# The API reads the files `just precompute benchmark` wrote; these tests put small ones of their own in place.
# The Benchmark itself is tested in packages/wordle/tests/test_benchmark.py.


@pytest.fixture(scope="module")
def served(client):
    """The client with the eight Benchmarks on 12 Answers and three Openers in place of the real files."""
    state = client.app.state
    before = state.benchmark, state.openers
    with ThreadPoolExecutor(max_workers=8) as threads:
        strategies = list(threads.map(lambda how: benchmark.run_benchmark(state.solver, how, SUBSET), STRATEGIES))
    state.benchmark = {"guess_limit": 6, "strategies": strategies}
    state.openers = {"openers": benchmark.opener_leaderboard(state.solver, 3)}
    yield client
    state.benchmark, state.openers = before


def test_benchmark_endpoint_shape(served):
    body = served.get("/api/benchmark").json()
    assert body["guess_limit"] == 6
    assert [entry["id"] for entry in body["strategies"]] == [how.id for how in STRATEGIES]
    for entry in body["strategies"]:
        assert set(entry) == {"id", "name", "pool", "scope", "by", "opener", "games", "distribution", "losses", "lost_answers", "average_guess_count"}
        assert len(entry["distribution"]) == 6 and entry["games"] == len(SUBSET)
    names = {entry["id"]: entry["name"] for entry in body["strategies"]}
    assert names["bits-answers-candidates"] == "Expected Information, Answer List, Candidates only"


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
            assert response.status_code == 503 and "just precompute benchmark" in response.json()["detail"]
        assert client.get("/api/feedback", params={"guess": "crane", "answer": "crane"}).status_code == 200
    finally:
        state.benchmark, state.openers = before
