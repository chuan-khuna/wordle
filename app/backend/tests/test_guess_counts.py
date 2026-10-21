import pytest

from wordle.solver.strategy import STRATEGIES

# The API reads the summary `just precompute-guess-counts` wrote; these tests put a small one of their own in place.
# The summary itself is tested in packages/wordle/tests.


def entry(id: str, name: str, words: list[tuple[str, float, int, bool]], complete_rows: int | None = None) -> dict:
    return {
        "id": id,
        "name": name,
        "complete_rows": len(words) if complete_rows is None else complete_rows,
        "openers": [
            {"rank": rank, "word": word, "average_guess_count": average, "losses": losses, "distribution": [0, 1, 2, 3, 4, 5], "bits": 5.0, "is_answer": is_answer}
            for rank, (word, average, losses, is_answer) in enumerate(words, start=1)
        ],
    }


FIXTURE = {
    "bits-guesses-all": entry("bits-guesses-all", "Expected Information, Guess List, All words", [("tarse", 3.429, 2, False), ("crane", 3.5, 3, True), ("qajaq", 4.117, 9, False)], complete_rows=3),
    "bits-guesses-candidates": entry("bits-guesses-candidates", "Expected Information, Guess List, Candidates only", [("salet", 3.528, 8, False), ("slate", 3.529, 7, True)]),
    "expected-answers-all": entry("expected-answers-all", "Expected Candidates, Answer List, All words", [("raise", 3.52, 0, True)]),
}


@pytest.fixture(scope="module")
def served(client):
    state = client.app.state
    before = state.guess_counts
    state.guess_counts = FIXTURE
    yield client
    state.guess_counts = before


def test_shape_and_rank_order(served):
    body = served.get("/api/guess-counts", params={"strategy": "bits-guesses-candidates"}).json()
    assert set(body) == {"strategy", "complete_rows", "total_rows", "openers"}
    assert body["strategy"] == {"id": "bits-guesses-candidates", "name": "Expected Information, Guess List, Candidates only"}
    assert body["complete_rows"] == 2 and body["total_rows"] == 14855
    assert [o["rank"] for o in body["openers"]] == [1, 2]
    assert body["openers"][0] == {"rank": 1, "word": "salet", "average_guess_count": 3.528, "losses": 8, "is_answer": False}


def test_default_strategy_is_bits_guesses_all(served):
    body = served.get("/api/guess-counts").json()
    assert body["strategy"]["id"] == "bits-guesses-all"
    assert [o["word"] for o in body["openers"]] == ["tarse", "crane", "qajaq"]


def test_partial_matrix_reports_complete_rows(served):
    body = served.get("/api/guess-counts", params={"strategy": "bits-guesses-all"}).json()
    assert body["complete_rows"] == 3 and body["total_rows"] == 14855


def test_answer_list_strategy_has_answer_list_rows(served):
    body = served.get("/api/guess-counts", params={"strategy": "expected-answers-all"}).json()
    assert body["strategy"]["name"] == "Expected Candidates, Answer List, All words"
    assert body["complete_rows"] == 1 and body["total_rows"] == 2315


@pytest.mark.parametrize("how", STRATEGIES, ids=lambda how: how.id)
def test_every_strategy_id_is_accepted(served, how):
    response = served.get("/api/guess-counts", params={"strategy": how.id})
    # The fixture holds three of the eight; the rest are known ids missing from the summary, not bad requests.
    assert response.status_code == (200 if how.id in FIXTURE else 503)


def test_unknown_strategy_is_400(served):
    for unknown in ("nope", "bits-all"):  # an old version 1 id is unknown too
        response = served.get("/api/guess-counts", params={"strategy": unknown})
        detail = response.json()["detail"]
        assert response.status_code == 400 and repr(unknown) in detail
        assert all(how.id in detail for how in STRATEGIES)


def test_strategy_missing_from_the_summary_is_503(served):
    response = served.get("/api/guess-counts", params={"strategy": "expected-guesses-all"})
    assert response.status_code == 503


def test_response_is_gzipped(served):
    big = [(f"w{i:04d}", 3.5, 0, False) for i in range(500)]
    served.app.state.guess_counts = {**FIXTURE, "bits-guesses-all": entry("bits-guesses-all", "Expected Information, Guess List, All words", big)}
    response = served.get("/api/guess-counts", headers={"Accept-Encoding": "gzip"})
    assert response.headers["content-encoding"] == "gzip"
    assert len(response.json()["openers"]) == 500
    served.app.state.guess_counts = FIXTURE


def test_missing_summary_is_503_and_the_rest_still_works(client):
    state = client.app.state
    before = state.guess_counts
    state.guess_counts = None
    try:
        response = client.get("/api/guess-counts")
        assert response.status_code == 503 and "just precompute-guess-counts" in response.json()["detail"]
        assert client.get("/api/feedback", params={"guess": "crane", "answer": "crane"}).status_code == 200
    finally:
        state.guess_counts = before
