"""`GET /api/solve`: the Solver plays an Answer one Guess at a time."""

from fastapi import APIRouter, Request

from wordle.engine.feedback import feedback
from wordle.solver.matrix import WIN
from wordle.solver.strategy import Pool, Rank, Scope, pack
from wordle_backend.common import BadRequest, feedback_json, solver_of, stats_json

router = APIRouter(prefix="/api")

MAX_GUESSES = 12  # a safety stop; Candidates-only search never needs more than 8
SOLVE_ALTERNATIVES = 5  # Suggestions listed at each step


@router.get("/solve")
def get_solve(
    request: Request,
    answer: str,
    pool: Pool = "guesses",
    scope: Scope = "global",
    by: Rank = "bits",
    opener: str | None = None,
) -> dict:
    """The Solver plays `answer` (an Answer List word) one Guess at a time, best Suggestion each step.

    With `opener` (a word of the Guess Pool) that word is Guess 1 instead; step 1's alternatives are still the
    Strategy's top Suggestions, so they may not include it.
    """
    solver = solver_of(request)
    answer = answer.strip().lower()
    if not solver.is_answer(answer):
        raise BadRequest(f"answer {answer!r} is not on the Answer List")
    if opener is not None:
        opener = opener.strip().lower()
        on_pool = solver.is_answer(opener) if pool == "answers" else solver.is_guess(opener)
        if not on_pool:
            raise BadRequest(f"opener {opener!r} is not on the Guess Pool")
    candidates = solver.all_candidates()
    steps = []
    for number in range(1, MAX_GUESSES + 1):
        # The Opener is ranked over the whole Guess Pool, whatever the Search Scope (as in the Benchmark).
        ranked = solver.rank(candidates, pool=pool, scope="global" if number == 1 else scope, by=by, top=SOLVE_ALTERNATIVES)
        guess = opener if number == 1 and opener is not None else ranked[0].word
        code = pack(feedback(guess, answer))
        after = solver.narrow(candidates, guess, code)
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
