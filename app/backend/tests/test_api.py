import pytest

from wordle.engine.feedback import feedback
from wordle.engine.words import load_word_lists
from wordle.solver.strategy import Solver, pack
from wordle.solver.matrix import DEFAULT_DIR
from wordle_backend.solver import WebSolver


def turn(guess: str, answer: str) -> dict:
    return {"guess": guess, "feedback": "".join(str(mark.value) for mark in feedback(guess, answer))}


# Leaves exactly two Candidates, "batch" and "hatch" (checked in the tests below).
TWO_CANDIDATES = [turn("raise", "hatch"), turn("tangy", "hatch"), turn("caput", "hatch"), turn("mound", "hatch"), turn("wound", "hatch"), turn("lilac", "hatch")]


def test_feedback(client):
    body = client.get("/api/feedback", params={"guess": "speed", "answer": "abide"}).json()
    assert body["marks"] == "00101"
    assert body["code"] == pack(feedback("speed", "abide"))


def test_feedback_win(client):
    body = client.get("/api/feedback", params={"guess": "crane", "answer": "crane"}).json()
    assert body == {"guess": "crane", "answer": "crane", "marks": "22222", "code": 242}


@pytest.mark.parametrize(
    "request_",
    [
        ("get", "/api/feedback", {"params": {"guess": "zzzzz", "answer": "crane"}}),
        ("get", "/api/feedback", {"params": {"guess": "crane"}}),
        ("get", "/api/solve", {"params": {"answer": "zzzzz"}}),
        ("get", "/api/solve", {"params": {"answer": "crane", "by": "nope"}}),
        ("post", "/api/candidates", {"json": {"state": [{"guess": "zzzzz", "feedback": "00000"}]}}),
        ("post", "/api/candidates", {"json": {"state": [{"guess": "crane", "feedback": "0003"}]}}),
        ("post", "/api/split", {"json": {"guess": "abcde", "state": []}}),
        ("post", "/api/split", {"json": {"guess": "crane", "state": [{"guess": "crane", "feedback": "22222"}, {"guess": "slate", "feedback": "22222"}]}}),
        ("post", "/api/suggestions", {"json": {"state": [], "pool": "everything"}}),
        ("post", "/api/suggestions", {"json": {"state": [], "top": 0}}),
    ],
)
def test_bad_input_is_400_with_a_message(client, request_):
    method, url, kwargs = request_
    response = getattr(client, method)(url, **kwargs)
    assert response.status_code == 400
    assert response.json()["detail"]


def test_candidates_match_the_filter(client):
    state = [turn("slate", "crane"), turn("pound", "crane")]
    body = client.post("/api/candidates", json={"state": state}).json()
    expected = [a for a in load_word_lists().answers if all(pack(feedback(t["guess"], a)) == int(t["feedback"], 3) for t in state)]
    assert body["words"] == expected
    assert body["count"] == len(expected) and "crane" in expected


def test_candidates_empty_state_is_everything(client):
    assert client.post("/api/candidates", json={"state": []}).json()["count"] == 2315


def test_split(client):
    body = client.post("/api/split", json={"guess": "raise", "state": []}).json()
    assert body["candidates"] == 2315
    assert sum(group["count"] for group in body["split"]) == 2315
    counts = [group["count"] for group in body["split"]]
    assert counts == sorted(counts, reverse=True)
    assert body["expected_candidates"] == pytest.approx(sum(c * c for c in counts) / 2315)
    for group in body["split"]:
        assert all(pack(feedback("raise", w)) == group["code"] for w in group["words"])
    assert 5.8 < body["bits"] < 6.0  # RAISE's known value is about 5.88


def test_suggestions_first_turn(client):
    body = client.post("/api/suggestions", json={"state": [], "top": 3}).json()
    assert body["candidates"] == 2315
    assert len(body["suggestions"]) == 3
    bits = [s["bits"] for s in body["suggestions"]]
    assert bits == sorted(bits, reverse=True)
    assert all(not s["is_candidate"] or s["win_chance"] > 0 for s in body["suggestions"])


def test_suggestions_by_expected_is_ascending(client):
    body = client.post("/api/suggestions", json={"state": [], "by": "expected", "top": 5}).json()
    values = [s["expected_candidates"] for s in body["suggestions"]]
    assert values == sorted(values)


def test_suggestions_scope_and_pool(client):
    state = [turn("raise", "match")]
    only = client.post("/api/suggestions", json={"state": state, "scope": "candidates", "pool": "answers", "top": 20}).json()
    everyone = set(client.post("/api/candidates", json={"state": state}).json()["words"])
    assert all(s["word"] in everyone and s["is_candidate"] for s in only["suggestions"])
    answers = set(load_word_lists().answers)
    wide = client.post("/api/suggestions", json={"state": state, "pool": "answers", "top": 50}).json()
    assert all(s["word"] in answers for s in wide["suggestions"])


def test_tie_goes_to_a_candidate_then_alphabetical(client):
    # Two Candidates left: either splits them perfectly, so the alphabetical first wins.
    state = TWO_CANDIDATES
    words = client.post("/api/candidates", json={"state": state}).json()["words"]
    assert len(words) == 2
    top = client.post("/api/suggestions", json={"state": state, "top": 1}).json()["suggestions"][0]
    assert top["word"] == words[0] and top["is_candidate"]


def test_two_or_fewer_candidates_switches_to_candidates_only(client):
    state = TWO_CANDIDATES
    words = client.post("/api/candidates", json={"state": state}).json()["words"]
    body = client.post("/api/suggestions", json={"state": state, "scope": "global", "top": 10}).json()
    assert {s["word"] for s in body["suggestions"]} == set(words)


def test_solve_plays_a_game_to_the_end(client):
    body = client.get("/api/solve", params={"answer": "crane"}).json()
    assert body["solved"] and body["guesses"] == len(body["steps"])
    first, last = body["steps"][0], body["steps"][-1]
    assert first["candidates_before"] == 2315 and first["alternatives"][0]["word"] == first["guess"]
    assert last["code"] == 242 and last["guess"] == "crane" and last["marks"] == "22222"
    for a, b in zip(body["steps"], body["steps"][1:]):
        assert a["candidates_after"] == b["candidates_before"]


def test_solve_candidates_only_hits_the_atch_trap(client):
    # Seed 5924 in solver-strategy.md: Candidates-only search from RAISE needs 8 Guesses.
    params = {"answer": "watch", "scope": "candidates", "pool": "answers"}
    assert client.get("/api/solve", params=params).json()["guesses"] > 6


def test_solve_ranks_the_opener_over_the_whole_guess_pool(client):
    # Candidates only from the second Guess on: the Guess List Opener is TARSE, as in the Benchmark, not an Answer.
    params = {"answer": "watch", "scope": "candidates", "pool": "guesses"}
    steps = client.get("/api/solve", params=params).json()["steps"]
    assert steps[0]["guess"] == "tarse"
    assert all(s["alternatives"][0]["is_candidate"] for s in steps[1:])


def test_solve_without_opener_is_the_same_game_as_before(client):
    plain = client.get("/api/solve", params={"answer": "watch"}).json()
    best = client.get("/api/solve", params={"answer": "watch", "opener": plain["steps"][0]["guess"]}).json()
    assert best == plain


def test_solve_opener_becomes_guess_one_and_the_game_is_won(client):
    plain = client.get("/api/solve", params={"answer": "watch"}).json()
    body = client.get("/api/solve", params={"answer": "watch", "opener": "crane"}).json()
    assert body["steps"][0]["guess"] == "crane" and body["solved"]
    assert body["steps"][-1]["marks"] == "22222" and body["steps"][-1]["guess"] == "watch"
    # Step 1's alternatives are still the Strategy's top Suggestions, not ranked around the Opener.
    assert body["steps"][0]["alternatives"] == plain["steps"][0]["alternatives"]
    assert body["steps"][0]["alternatives"][0]["word"] != "crane"
    assert body["steps"][0]["candidates_before"] == 2315
    for a, b in zip(body["steps"], body["steps"][1:]):
        assert a["candidates_after"] == b["candidates_before"]


def test_solve_opener_equal_to_the_answer_is_a_one_guess_game(client):
    body = client.get("/api/solve", params={"answer": "crane", "opener": "CRANE"}).json()
    assert body["guesses"] == 1 and body["solved"] and body["steps"][0]["marks"] == "22222"


def test_solve_opener_must_be_on_the_guess_pool(client):
    # AAHED is a Guess List word but not an Answer List word, so it is off the Answer List Guess Pool.
    off_pool = [{"opener": "zzzzz"}, {"opener": "aahed", "pool": "answers"}]
    for extra in off_pool:
        response = client.get("/api/solve", params={"answer": "crane", **extra})
        assert response.status_code == 400 and "Guess Pool" in response.json()["detail"]
    assert client.get("/api/solve", params={"answer": "crane", "opener": "aahed"}).status_code == 200


def test_rank_switches_to_candidates_only_at_two_candidates():
    # The package's Solver.rank does not; the backend's WebSolver does.
    solver = WebSolver.load(DEFAULT_DIR)
    candidates = solver.all_candidates()
    for t in TWO_CANDIDATES:
        candidates = solver.narrow(candidates, t["guess"], int(t["feedback"], 3))
    words = set(solver.words(candidates))
    assert len(words) == 2
    assert {s.word for s in solver.rank(candidates, scope="global")} == words
    assert any(s.word not in words for s in Solver.rank(solver, candidates, scope="global"))
