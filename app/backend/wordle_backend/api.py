"""The FastAPI app: Feedback, Candidates, Feedback Splits, Suggestions, step-through Games, the Benchmark and Openers.

Words are lowercase five-letter strings. A Feedback is written as a string of
five digits, one per letter: 0 Absent, 1 Present, 2 Correct ("20102"). The same
digits are the base-3 digits of its Feedback Code. Every response that holds a
Feedback gives both, as `marks` and `code`. Bad input gets HTTP 400 and
`{"detail": "<message>"}`, never FastAPI's default 422.
"""

from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from wordle_backend import benchmark, matrices
from wordle_backend.feedback import WIN, feedback, pack
from wordle_backend.strategy import By, Pool, Scope, Strategy, WordStats
from wordle_backend.words import WORD_LENGTH

MAX_GUESSES = 12  # a safety stop for /api/solve; Candidates-only search never needs more than 8
SOLVE_ALTERNATIVES = 5  # Suggestions listed at each step of /api/solve


class BadRequest(Exception):
    """Invalid input, answered with HTTP 400 and this message."""


class NotPrecomputed(Exception):
    """A precomputed result is missing, answered with HTTP 503 and this message."""


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Memory-map the Feedback matrices once. They are never built here: that takes seconds."""
    missing = [
        path.name for path in (matrices.DEFAULT_DIR / matrices.ANSWERS_FILE, matrices.DEFAULT_DIR / matrices.GUESSES_FILE)
        if not path.exists()
    ]
    if missing:
        raise RuntimeError(
            f"Feedback matrices missing in {matrices.DEFAULT_DIR} ({', '.join(missing)}). "
            "Run `just backend-precompute` first."
        )
    app.state.strategy = Strategy(*matrices.load())
    # The Benchmark files are optional: without them only those two endpoints answer 503.
    app.state.benchmark, app.state.openers = benchmark.load()
    yield


app = FastAPI(title="Wordle backend", lifespan=lifespan)


@app.exception_handler(BadRequest)
async def bad_request(request: Request, error: BadRequest) -> JSONResponse:
    return JSONResponse({"detail": str(error)}, status_code=400)


@app.exception_handler(NotPrecomputed)
async def not_precomputed(request: Request, error: NotPrecomputed) -> JSONResponse:
    return JSONResponse({"detail": str(error)}, status_code=503)


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, error: RequestValidationError) -> JSONResponse:
    """Missing or malformed parameters are 400 too, with the first problem as the message."""
    first = error.errors()[0]
    where = ".".join(str(part) for part in first["loc"] if part not in ("query", "body"))
    return JSONResponse({"detail": f"{where}: {first['msg']}"}, status_code=400)


# Request bodies and shared pieces


class TurnIn(BaseModel):
    guess: str
    feedback: str
    """Five digits, 0 Absent, 1 Present, 2 Correct."""


class StateIn(BaseModel):
    state: list[TurnIn] = []


class SplitIn(StateIn):
    guess: str


class SuggestionsIn(StateIn):
    pool: Pool = "guesses"
    scope: Scope = "global"
    by: By = "bits"
    top: int = 10


def marks_of(code: int) -> str:
    """A Feedback Code as its five Marks, e.g. 20102."""
    return "".join(str((code // 3**place) % 3) for place in reversed(range(WORD_LENGTH)))


def feedback_json(code: int) -> dict:
    return {"marks": marks_of(code), "code": code}


def stats_json(stats: WordStats) -> dict:
    return {
        "word": stats.word,
        "bits": stats.bits,
        "expected_candidates": stats.expected_candidates,
        "groups": stats.groups,
        "largest_group": stats.largest_group,
        "is_candidate": stats.is_candidate,
        "win_chance": stats.win_chance,
    }


def strategy_of(request: Request) -> Strategy:
    return request.app.state.strategy


def check_word(strategy: Strategy, word: str, name: str = "word") -> str:
    """The word, lowercased, if it is on the Guess List."""
    word = word.strip().lower()
    if word not in strategy.guess_row:
        raise BadRequest(f"{name} {word!r} is not a valid five-letter word")
    return word


def parse_marks(text: str) -> int:
    """The Feedback Code of a string of five digits 0, 1 or 2."""
    text = text.strip()
    if len(text) != WORD_LENGTH or any(c not in "012" for c in text):
        raise BadRequest(f"feedback {text!r} must be {WORD_LENGTH} digits, each 0 (Absent), 1 (Present) or 2 (Correct)")
    return int(text, 3)


def candidates_of(strategy: Strategy, state: list[TurnIn]) -> np.ndarray:
    """The Candidate Set (Answer List indices) for a State, validating each Turn."""
    candidates = strategy.all_candidates()
    for turn in state:
        guess = check_word(strategy, turn.guess, "guess")
        candidates = strategy.narrow(candidates, guess, parse_marks(turn.feedback))
    return candidates


def check_top(top: int) -> int:
    if top < 1:
        raise BadRequest("top must be at least 1")
    return top


# Endpoints


@app.get("/api/feedback")
def get_feedback(request: Request, guess: str, answer: str) -> dict:
    strategy = strategy_of(request)
    guess, answer = check_word(strategy, guess, "guess"), check_word(strategy, answer, "answer")
    return {"guess": guess, "answer": answer, **feedback_json(pack(feedback(guess, answer)))}


@app.post("/api/candidates")
def post_candidates(request: Request, body: StateIn) -> dict:
    strategy = strategy_of(request)
    words = strategy.words(candidates_of(strategy, body.state))
    return {"count": len(words), "words": words}


@app.post("/api/split")
def post_split(request: Request, body: SplitIn) -> dict:
    strategy = strategy_of(request)
    guess = check_word(strategy, body.guess, "guess")
    candidates = candidates_of(strategy, body.state)
    if len(candidates) == 0:
        raise BadRequest("no Candidates fit that State")
    stats = strategy.stats(guess, candidates)
    groups = [
        {**feedback_json(code), "count": len(words), "words": words}
        for code, words in strategy.split(guess, candidates).items()
    ]
    return {**stats_json(stats), "candidates": len(candidates), "split": groups}


@app.post("/api/suggestions")
def post_suggestions(request: Request, body: SuggestionsIn) -> dict:
    strategy = strategy_of(request)
    candidates = candidates_of(strategy, body.state)
    ranked = strategy.rank(candidates, pool=body.pool, scope=body.scope, by=body.by, top=check_top(body.top))
    return {"candidates": len(candidates), "suggestions": [stats_json(s) for s in ranked]}


@app.get("/api/solve")
def get_solve(
    request: Request,
    answer: str,
    pool: Pool = "guesses",
    scope: Scope = "global",
    by: By = "bits",
) -> dict:
    """The Solver plays `answer` (an Answer List word) one Guess at a time, best Suggestion each step."""
    strategy = strategy_of(request)
    answer = answer.strip().lower()
    if answer not in strategy.answer_column:
        raise BadRequest(f"answer {answer!r} is not on the Answer List")
    candidates = strategy.all_candidates()
    steps = []
    for number in range(1, MAX_GUESSES + 1):
        ranked = strategy.rank(candidates, pool=pool, scope=scope, by=by, top=SOLVE_ALTERNATIVES)
        guess = ranked[0].word
        code = pack(feedback(guess, answer))
        after = strategy.narrow(candidates, guess, code)
        steps.append({
            "number": number,
            "guess": guess,
            **feedback_json(code),
            "candidates_before": len(candidates),
            "candidates_after": len(after),
            "alternatives": [stats_json(s) for s in ranked],
        })
        candidates = after
        if code == WIN:
            break
    return {"answer": answer, "solved": steps[-1]["code"] == WIN, "guesses": len(steps), "steps": steps}


@app.get("/api/openers")
def get_openers(request: Request, top: int = 20) -> dict:
    """The Opener leaderboard (precomputed): the best first Guesses by Expected Information."""
    if request.app.state.openers is None:
        raise NotPrecomputed(f"{benchmark.OPENERS_FILE} is missing. Run `just backend-precompute` first.")
    openers = request.app.state.openers["openers"]
    return {"total": len(openers), "openers": openers[: check_top(top)]}


@app.get("/api/benchmark")
def get_benchmark(request: Request) -> dict:
    """The Guess Distribution and Average Guess Count of each Benchmark Strategy (precomputed)."""
    if request.app.state.benchmark is None:
        raise NotPrecomputed(f"{benchmark.BENCHMARK_FILE} is missing. Run `just backend-precompute` first.")
    return request.app.state.benchmark
