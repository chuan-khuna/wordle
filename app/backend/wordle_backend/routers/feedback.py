"""`GET /api/feedback`: the Marks and Feedback Code of a Guess against an Answer."""

from fastapi import APIRouter, Request

from wordle.engine.feedback import feedback
from wordle.solver.strategy import pack
from wordle_backend.common import check_word, feedback_json, solver_of

router = APIRouter(prefix="/api")


@router.get("/feedback")
def get_feedback(request: Request, guess: str, answer: str) -> dict:
    solver = solver_of(request)
    guess, answer = check_word(solver, guess, "guess"), check_word(solver, answer, "answer")
    return {"guess": guess, "answer": answer, **feedback_json(pack(feedback(guess, answer)))}
