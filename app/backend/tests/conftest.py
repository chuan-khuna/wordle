import pytest
from fastapi.testclient import TestClient

from wordle.solver import matrix
from wordle_backend.main import app
from wordle_backend.solver import DEFAULT_DIR


@pytest.fixture(scope="session")
def client():
    """A client with the app's lifespan running. Builds the matrices (a few seconds) only if missing."""
    if not (DEFAULT_DIR / matrix.ANSWERS_FILE).exists() or not (DEFAULT_DIR / matrix.GUESSES_FILE).exists():
        matrix.build(DEFAULT_DIR, threads=4)
    with TestClient(app) as client:
        yield client
