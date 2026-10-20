"""`POST /api/candidates` and `POST /api/split`: the Candidate Set for a State and a Guess's Feedback Split."""

from fastapi import APIRouter, Request

from wordle_backend.common import BadRequest, SplitIn, StateIn, candidates_of, check_word, feedback_json, solver_of, stats_json

router = APIRouter(prefix="/api")


@router.post("/candidates")
def post_candidates(request: Request, body: StateIn) -> dict:
    solver = solver_of(request)
    words = solver.words(candidates_of(solver, body.state))
    return {"count": len(words), "words": words}


@router.post("/split")
def post_split(request: Request, body: SplitIn) -> dict:
    solver = solver_of(request)
    guess = check_word(solver, body.guess, "guess")
    candidates = candidates_of(solver, body.state)
    if len(candidates) == 0:
        raise BadRequest("no Candidates fit that State")
    stats = solver.stats(guess, candidates)
    groups = [
        {**feedback_json(code), "count": len(words), "words": words}
        for code, words in solver.split(guess, candidates).items()
    ]
    return {**stats_json(stats), "candidates": len(candidates), "split": groups}
