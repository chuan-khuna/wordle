"""Pieces shared by the routers: errors, request models, word and Feedback checks, JSON shapes.

Words are lowercase five-letter strings. A Feedback is written as a string of
five digits, one per letter: 0 Absent, 1 Present, 2 Correct ("20102"). The same
digits are the base-3 digits of its Feedback Code. Every response that holds a
Feedback gives both, as `marks` and `code`.
"""

import numpy as np
from fastapi import Request
from pydantic import BaseModel

from wordle.engine.words import WORD_LENGTH
from wordle.solver.strategy import Pool, Rank, Scope, WordStats
from wordle_backend.solver import WebSolver


class BadRequest(Exception):
    """Invalid input, answered with HTTP 400 and this message."""


class NotPrecomputed(Exception):
    """A precomputed result is missing, answered with HTTP 503 and this message."""


# Request bodies


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
    by: Rank = "bits"
    top: int = 10


# Checks


def solver_of(request: Request) -> WebSolver:
    return request.app.state.solver


def check_word(solver: WebSolver, word: str, name: str = "word") -> str:
    """The word, lowercased, if it is on the Guess List."""
    word = word.strip().lower()
    if not solver.is_guess(word):
        raise BadRequest(f"{name} {word!r} is not a valid five-letter word")
    return word


def parse_marks(text: str) -> int:
    """The Feedback Code of a string of five digits 0, 1 or 2."""
    text = text.strip()
    if len(text) != WORD_LENGTH or any(c not in "012" for c in text):
        raise BadRequest(f"feedback {text!r} must be {WORD_LENGTH} digits, each 0 (Absent), 1 (Present) or 2 (Correct)")
    return int(text, 3)


def check_top(top: int) -> int:
    if top < 1:
        raise BadRequest("top must be at least 1")
    return top


def candidates_of(solver: WebSolver, state: list[TurnIn]) -> np.ndarray:
    """The Candidate Set (Answer List indices) for a State, validating each Turn."""
    candidates = solver.all_candidates()
    for turn in state:
        guess = check_word(solver, turn.guess, "guess")
        candidates = solver.narrow(candidates, guess, parse_marks(turn.feedback))
    return candidates


# JSON shapes


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
