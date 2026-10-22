from wordle_backend.main import cors_origins


def test_cors_origins_splits_and_trims():
    assert cors_origins(" http://localhost:5173/, ,http://192.168.1.60:3000 ") == [
        "http://localhost:5173",
        "http://192.168.1.60:3000",
    ]


def test_cors_origins_empty_is_none():
    assert cors_origins("") == []
