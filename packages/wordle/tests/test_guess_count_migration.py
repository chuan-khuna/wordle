import json

import numpy as np
import pytest

from wordle.solver import cli
from wordle.solver.guess_count_matrix import build, filled_rows, folder_mismatch, matrix_path, mismatch, ranking_path
from wordle.solver.guess_count_migration import MigrationRefused, migrate, plan
from wordle.solver.strategy import STRATEGIES, Solver

BY_ID = {how.id: how for how in STRATEGIES}


@pytest.fixture(scope="module")
def solver() -> Solver:
    return Solver.load()


def old_matrix(solver, rows: dict[str, int], partial: str | None = None) -> np.ndarray:
    """A version 1 matrix (every Guess List row) with `rows` filled by one Guess Count, and `partial` half filled."""
    matrix = np.zeros((len(solver.guesses), len(solver.answers)), dtype=np.uint8)
    for word, count in rows.items():
        matrix[solver.guesses.index(word)] = count
    if partial:
        matrix[solver.guesses.index(partial), : len(solver.answers) // 2] = 5
    return matrix


def write_version_1_folder(tmp_path, solver) -> dict[str, np.ndarray]:
    """A version 1 folder with `bits-candidates` (one Guess List Opener, two Answers, a partial row) and `bits-all`."""
    folder = tmp_path / "guess-counts"
    folder.mkdir(parents=True)
    matrices = {
        "bits-candidates": old_matrix(solver, {"salet": 3, "raise": 4, "aback": 6}, partial="slate"),
        "bits-all": old_matrix(solver, {"tarse": 3}),
    }
    definitions = {
        "bits-candidates": {"name": "Expected Information, Candidates only", "pool": "answers", "scope": "candidates", "ranked_by": "bits"},
        "bits-all": {"name": "Expected Information, All words", "pool": "guesses", "scope": "global", "ranked_by": "bits"},
    }
    for id, matrix in matrices.items():
        np.save(folder / f"{id}.npy", matrix)
        (folder / f"{id}.ranking.csv").write_text("rank,opener\n")
    manifest = {
        "format_version": 1,
        "tool": "wordle precompute-guess-counts (python)",
        "safety_limit": 12,
        "strategies": definitions,
        "rows": list(solver.guesses),
        "columns": list(solver.answers),
    }
    (folder / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")) + "\n")
    (folder / "summary.json").write_text("{}\n")
    return matrices


def contents(tmp_path) -> dict[str, bytes]:
    folder = tmp_path / "guess-counts"
    return {str(path.relative_to(folder)): path.read_bytes() for path in folder.rglob("*") if path.is_file()}


def test_migration_copies_the_rows_byte_for_byte_and_slices_the_answer_list_rows(solver, tmp_path):
    old = write_version_1_folder(tmp_path, solver)
    migrate(tmp_path, solver)

    guesses = np.load(matrix_path(tmp_path, BY_ID["bits-guesses-candidates"]))
    assert guesses.dtype == np.uint8 and guesses.tobytes() == old["bits-candidates"].tobytes()
    assert np.load(matrix_path(tmp_path, BY_ID["bits-guesses-all"])).tobytes() == old["bits-all"].tobytes()

    answers = np.load(matrix_path(tmp_path, BY_ID["bits-answers-candidates"]))
    assert answers.shape == (2315, 2315)
    for r, word in enumerate(solver.answers):
        assert np.array_equal(answers[r], old["bits-candidates"][solver.guesses.index(word)])
    assert answers[solver.answers.index("raise")].tolist() == [4] * 2315  # salet is not on the Answer List
    assert not matrix_path(tmp_path, BY_ID["expected-guesses-candidates"]).exists()  # no version 1 file, nothing new

    names = set(contents(tmp_path))
    assert names == {
        "manifest.json",
        "summary.json",
        "bits/guesses-candidates.npy",
        "bits/guesses-candidates.ranking.csv",
        "bits/answers-candidates.npy",
        "bits/answers-candidates.ranking.csv",
        "bits/guesses-all.npy",
        "bits/guesses-all.ranking.csv",
    }  # the version 1 matrices and CSVs are gone

    manifest = json.loads((tmp_path / "guess-counts" / "manifest.json").read_text())
    assert manifest["format_version"] == 2
    assert set(manifest["strategies"]) == {"bits-guesses-candidates", "bits-answers-candidates", "bits-guesses-all"}
    assert folder_mismatch(tmp_path) is None
    summary = json.loads((tmp_path / "guess-counts" / "summary.json").read_text())
    assert [o["word"] for o in summary["bits-guesses-candidates"]["openers"]] == ["salet", "raise", "aback"]
    assert [o["word"] for o in summary["bits-answers-candidates"]["openers"]] == ["raise", "aback"]
    assert [o["word"] for o in summary["bits-guesses-all"]["openers"]] == ["tarse"]
    assert ranking_path(tmp_path, BY_ID["bits-answers-candidates"]).read_text().count("\n") == 3  # header and two


def test_a_partial_matrix_stays_partial_and_resumable(solver, tmp_path):
    write_version_1_folder(tmp_path, solver)
    migrate(tmp_path, solver)
    for id, complete, rows in (("bits-guesses-candidates", 3, 4), ("bits-answers-candidates", 2, 3)):
        how = BY_ID[id]
        assert mismatch(tmp_path, how, solver) is None  # the manifest vouches for it, so a plain run resumes it
        assert filled_rows(tmp_path, how) == rows
        summary = json.loads((tmp_path / "guess-counts" / "summary.json").read_text())
        assert summary[id]["complete_rows"] == complete  # slate is half filled, so not complete
        row = np.load(matrix_path(tmp_path, how))[solver.pool_words(how.pool).index("slate")]
        assert (row[:1157] == 5).all() and (row[1157:] == 0).all()
    # Resuming fills only zero rows: asking for another Opener leaves the migrated rows as they were.
    how = BY_ID["bits-answers-candidates"]
    before = np.load(matrix_path(tmp_path, how))
    build(tmp_path, (how,), ["zonal"], solver)
    after = np.load(matrix_path(tmp_path, how))
    zonal = solver.answers.index("zonal")
    assert after[zonal].all() and np.array_equal(np.delete(after, zonal, 0), np.delete(before, zonal, 0))


def test_refuses_a_version_2_folder(solver, tmp_path):
    write_version_1_folder(tmp_path, solver)
    migrate(tmp_path, solver)
    before = contents(tmp_path)
    with pytest.raises(MigrationRefused, match="already format version 2"):
        migrate(tmp_path, solver)
    assert contents(tmp_path) == before


def test_refuses_other_word_lists(solver, tmp_path):
    write_version_1_folder(tmp_path, solver)
    path = tmp_path / "guess-counts" / "manifest.json"
    manifest = json.loads(path.read_text())
    manifest["columns"] = manifest["columns"][:-1]
    path.write_text(json.dumps(manifest))
    before = contents(tmp_path)
    with pytest.raises(MigrationRefused, match="word lists"):
        migrate(tmp_path, solver)
    assert contents(tmp_path) == before


def test_refuses_a_folder_without_a_manifest(solver, tmp_path):
    with pytest.raises(MigrationRefused, match="no manifest.json"):
        plan(tmp_path, solver)


def run_command(monkeypatch, solver, tmp_path, *flags, answer=False):
    """Run `migrate-guess-counts` on `tmp_path`; returns the questions asked."""
    asked = []

    class Confirm:
        def __init__(self, question, **kwargs):
            asked.append(question)

        def ask(self):
            return answer

    monkeypatch.setattr(cli.Solver, "load", staticmethod(lambda: solver))
    monkeypatch.setattr(cli.questionary, "confirm", Confirm)
    monkeypatch.setattr("sys.argv", ["migrate-guess-counts", "--out", str(tmp_path), *flags])
    cli.migrate_guess_counts()
    return asked


def test_the_command_asks_first_and_cancel_writes_nothing(monkeypatch, solver, tmp_path):
    write_version_1_folder(tmp_path, solver)
    before = contents(tmp_path)
    [question] = run_command(monkeypatch, solver, tmp_path, answer=False)
    assert "bits-candidates.npy -> bits/guesses-candidates.npy, bits/answers-candidates.npy" in question
    assert contents(tmp_path) == before
    assert run_command(monkeypatch, solver, tmp_path, answer=True)
    assert folder_mismatch(tmp_path) is None


def test_the_command_migrates_with_yes_without_asking_and_refuses_a_second_time(monkeypatch, solver, tmp_path):
    write_version_1_folder(tmp_path, solver)
    assert run_command(monkeypatch, solver, tmp_path, "--yes") == []
    assert folder_mismatch(tmp_path) is None
    with pytest.raises(SystemExit, match="already format version 2"):
        run_command(monkeypatch, solver, tmp_path, "--yes")
