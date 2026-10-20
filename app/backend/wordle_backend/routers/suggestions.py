"""`POST /api/suggestions`: ranked Guesses for a State."""

from fastapi import APIRouter, Request

from wordle_backend.common import SuggestionsIn, candidates_of, check_top, solver_of, stats_json

router = APIRouter(prefix="/api")


@router.post("/suggestions")
def post_suggestions(request: Request, body: SuggestionsIn) -> dict:
    solver = solver_of(request)
    candidates = candidates_of(solver, body.state)
    ranked = solver.rank(candidates, pool=body.pool, scope=body.scope, by=body.by, top=check_top(body.top))
    return {"candidates": len(candidates), "suggestions": [stats_json(s) for s in ranked]}
