"""`GET /api/guess-counts`: every Opener played out under one Strategy, from the Guess Count Matrix summary."""

from fastapi import APIRouter, Request

from wordle.solver.guess_count_matrix import SUBDIR, SUMMARY_FILE
from wordle.solver.strategy import STRATEGIES
from wordle_backend.common import BadRequest, NotPrecomputed, solver_of

router = APIRouter(prefix="/api")

DEFAULT_STRATEGY = "bits-all"


@router.get("/guess-counts")
def get_guess_counts(request: Request, strategy: str = DEFAULT_STRATEGY) -> dict:
    """The Openers with a finished row, best first: Average Guess Count, Losses and whether each is an Answer (precomputed)."""
    summary = request.app.state.guess_counts
    if summary is None:
        raise NotPrecomputed(f"{SUBDIR}/{SUMMARY_FILE} is missing. Run `just precompute-guess-counts` (or `just restore-cache`) first.")
    if strategy not in {how.id for how in STRATEGIES}:
        raise BadRequest(f"strategy {strategy!r} must be one of {', '.join(how.id for how in STRATEGIES)}")
    entry = summary.get(strategy)
    if entry is None:
        raise NotPrecomputed(f"{strategy} is not in {SUBDIR}/{SUMMARY_FILE}. Run `just precompute-guess-counts` first.")
    return {
        "strategy": {"id": entry["id"], "name": entry["name"]},
        "complete_rows": entry["complete_rows"],
        "total_rows": len(solver_of(request).guesses),
        "openers": [
            {key: opener[key] for key in ("rank", "word", "average_guess_count", "losses", "is_answer")}
            for opener in entry["openers"]
        ],
    }
