import pytest
from fastapi.testclient import TestClient

from wordle_backend import matrices
from wordle_backend.api import app


@pytest.fixture(scope="session")
def client():
    """A client with the app's lifespan running. Builds the matrices (a few seconds) only if missing."""
    if not (matrices.DEFAULT_DIR / matrices.ANSWERS_FILE).exists() or not (matrices.DEFAULT_DIR / matrices.GUESSES_FILE).exists():
        matrices.build(threads=4)
    with TestClient(app) as client:
        yield client
