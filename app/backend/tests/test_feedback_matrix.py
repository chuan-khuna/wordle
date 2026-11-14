from pathlib import Path

import numpy as np
import pytest

from wordle.engine.feedback import feedback
from wordle.engine.words import load_word_lists
from wordle.solver.strategy import pack

ANSWERS_FILE = Path(__file__).parents[3] / "packages/wordle/src/wordle/data/answers.txt"


def frontend_answer_list() -> list[str]:
    """The Answer List as the website reads it at build time (`answerList()` in words.ts): non-empty lines, default JS sort."""
    words = [line for line in ANSWERS_FILE.read_text(encoding="utf-8").splitlines() if line]
    # JS sorts by UTF-16 code unit; for lowercase ASCII that is Python's order too.
    assert all(word.isascii() and word.islower() and len(word) == 5 for word in words)
    return sorted(words)


@pytest.fixture(scope="module")
def cells(client) -> np.ndarray:
    response = client.get("/api/feedback-matrix")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/octet-stream"
    assert response.headers["content-encoding"] == "gzip"
    assert "max-age" in response.headers["cache-control"]
    n = len(frontend_answer_list())
    assert len(response.content) == n * n
    return np.frombuffer(response.content, dtype=np.uint8).reshape(n, n)


def test_matrix_order_is_the_website_answer_list(client):
    assert len(frontend_answer_list()) == 2315
    assert frontend_answer_list() == list(load_word_lists().answers)


def test_size_is_answer_list_squared(cells):
    assert cells.shape == (2315, 2315)


@pytest.mark.parametrize(
    ("guess", "answer"),
    [("crane", "abide"), ("speed", "abide"), ("abbey", "kebab"), ("eerie", "geese"), ("llama", "label"), ("zonal", "aback")],
)
def test_cell_is_the_feedback_of_guess_and_answer(cells, guess, answer):
    words = frontend_answer_list()
    assert cells[words.index(guess), words.index(answer)] == pack(feedback(guess, answer))


def test_rows_are_guesses_and_columns_answers(cells):
    words = frontend_answer_list()
    g, a = words.index("speed"), words.index("abide")
    # Not symmetric: swapping Guess and Answer changes the Feedback.
    assert pack(feedback("speed", "abide")) != pack(feedback("abide", "speed"))
    assert cells[g, a] == pack(feedback("speed", "abide"))
    assert cells[a, g] == pack(feedback("abide", "speed"))


def test_diagonal_is_all_wins(cells):
    assert (np.diagonal(cells) == 242).all()
    assert (cells == 242).sum() == len(cells)


def test_plain_bytes_without_gzip(client, cells):
    response = client.get("/api/feedback-matrix", headers={"Accept-Encoding": "identity"})
    assert "content-encoding" not in response.headers
    assert response.content == cells.tobytes()


def test_missing_matrix_is_503(client, tmp_path):
    state = client.app.state
    before = state.feedback_matrix_file, state.feedback_matrix
    state.feedback_matrix_file, state.feedback_matrix = tmp_path / "answers_vs_answers.npy", None
    try:
        response = client.get("/api/feedback-matrix")
        assert response.status_code == 503
        assert "just precompute feedback" in response.json()["detail"]
    finally:
        state.feedback_matrix_file, state.feedback_matrix = before
