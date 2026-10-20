import csv
import json

import numpy as np
import pytest

from wordle.engine.feedback import feedback
from wordle.solver.guess_count_matrix import ManifestMismatch, build, matrix_path, ranking_path, summarize
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


HOW = STRATEGIES[0]  # bits-candidates: cheap; the tests below fill a handful of Openers


def saved(tmp_path):
    return np.load(matrix_path(tmp_path, HOW), mmap_mode="r+")


def stop_after(calls, n):
    """An `after_row` hook that records each row and presses Ctrl+C after the `n`th."""

    def hook(how, row):
        calls.append(row)
        if len(calls) == n:
            raise KeyboardInterrupt

    return hook


def edit_manifest(tmp_path, change):
    path = tmp_path / "guess-counts" / "manifest.json"
    manifest = json.loads(path.read_text())
    change(manifest)
    path.write_text(json.dumps(manifest))


def test_manifest_holds_the_word_lists_and_strategies(solver, tmp_path):
    build(tmp_path, (HOW,), ["raise"], solver)
    manifest = json.loads((tmp_path / "guess-counts" / "manifest.json").read_text())
    assert manifest["rows"] == list(solver.guesses)
    assert manifest["columns"] == list(solver.answers)
    assert manifest["safety_limit"] == 12 and manifest["format_version"] == 1 and manifest["tool"]
    assert manifest["strategies"] == {
        "bits-candidates": {
            "name": HOW.name,
            "pool": "answers",
            "scope": "candidates",
            "ranked_by": "bits",
        }
    }


def test_resume_keeps_filled_rows_fills_zero_rows_and_keeps_finished_rows_on_ctrl_c(solver, tmp_path):
    build(tmp_path, (HOW,), ["raise"], solver)
    raise_row = solver.guesses.index("raise")
    matrix = saved(tmp_path)
    matrix[raise_row] = 7  # a known row, not what play would give
    matrix.flush()
    del matrix

    calls = []
    with pytest.raises(KeyboardInterrupt):  # Ctrl+C after the third row
        build(tmp_path, (HOW,), None, solver, after_row=stop_after(calls, 3))

    assert calls == [0, 1, 2]  # the first zero rows, in order; the filled row is skipped
    matrix = saved(tmp_path)
    assert (matrix[raise_row] == 7).all()
    for row in calls:
        assert matrix[row, 0] == play_alone(solver, HOW, solver.guesses[row], solver.answers[0])
    assert np.flatnonzero(matrix.any(axis=1)).tolist() == [0, 1, 2, raise_row]
    summary = json.loads((tmp_path / "guess-counts" / "summary.json").read_text())
    assert summary["bits-candidates"]["complete_rows"] == 4  # the finished rows are in the partial summary
    assert {o["word"] for o in summary["bits-candidates"]["openers"]} == {
        *(solver.guesses[r] for r in calls),
        "raise",
    }


def test_asking_for_an_opener_plays_a_finished_row_again(solver, tmp_path):
    build(tmp_path, (HOW,), ["raise"], solver)
    matrix = saved(tmp_path)
    matrix[solver.guesses.index("raise")] = 7
    matrix.flush()
    del matrix

    build(tmp_path, (HOW,), ["raise"], solver)

    row = saved(tmp_path)[solver.guesses.index("raise")]
    for i in SUBSET:
        assert row[i] == play_alone(solver, HOW, "raise", solver.answers[i])


def test_fresh_clears_the_matrix_first(solver, tmp_path):
    build(tmp_path, (HOW,), ["raise"], solver)
    build(tmp_path, (HOW,), ["salet"], solver, fresh=True)
    matrix = saved(tmp_path)
    assert np.flatnonzero(matrix.any(axis=1)).tolist() == [solver.guesses.index("salet")]


def test_resume_refuses_when_the_manifest_differs(solver, tmp_path):
    build(tmp_path, (HOW,), ["raise"], solver)

    def swap_rows(manifest):
        manifest["rows"][0], manifest["rows"][1] = manifest["rows"][1], manifest["rows"][0]

    def other_strategy(manifest):
        manifest["strategies"]["bits-candidates"]["ranked_by"] = "expected"

    for change in (swap_rows, other_strategy):
        edit_manifest(tmp_path, change)
        before = matrix_path(tmp_path, HOW).read_bytes()
        with pytest.raises(ManifestMismatch):
            build(tmp_path, (HOW,), ["salet"], solver)
        assert matrix_path(tmp_path, HOW).read_bytes() == before  # nothing was written
        build(tmp_path, (HOW,), ["raise"], solver, fresh=True)  # start over repairs the manifest


def test_resume_refuses_without_a_manifest(solver, tmp_path):
    build(tmp_path, (HOW,), ["raise"], solver)
    (tmp_path / "guess-counts" / "manifest.json").unlink()
    with pytest.raises(ManifestMismatch):
        build(tmp_path, (HOW,), ["salet"], solver)


def test_summary_is_compact_and_the_ranking_csv_matches_it(solver, tmp_path):
    build(tmp_path, (HOW,), ["salet", "raise"], solver)
    text = (tmp_path / "guess-counts" / "summary.json").read_text()
    assert text.count("\n") == 1  # one line and its newline: no indent
    openers = json.loads(text)["bits-candidates"]["openers"]

    with ranking_path(tmp_path, HOW).open(newline="") as file:
        rows = list(csv.DictReader(file))
    assert list(rows[0]) == [
        "rank", "opener", "average_guess_count", "losses",
        "won_in_1", "won_in_2", "won_in_3", "won_in_4", "won_in_5", "won_in_6",
        "bits", "is_answer",
    ]  # fmt: skip
    assert len(rows) == len(openers) == 2
    for row, entry in zip(rows, openers):
        assert int(row["rank"]) == entry["rank"] and row["opener"] == entry["word"]
        assert float(row["average_guess_count"]) == entry["average_guess_count"]
        assert int(row["losses"]) == entry["losses"]
        assert [int(row[f"won_in_{n}"]) for n in range(1, 7)] == entry["distribution"]
        assert float(row["bits"]) == entry["bits"]
        assert (row["is_answer"] == "True") == entry["is_answer"]
