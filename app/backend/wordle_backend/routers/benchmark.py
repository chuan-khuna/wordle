"""`GET /api/benchmark` and `GET /api/openers`: the precomputed Benchmark and Opener leaderboard."""

from fastapi import APIRouter, Request

from wordle.solver.benchmark import BENCHMARK_FILE, OPENERS_FILE
from wordle_backend.common import NotPrecomputed, check_top

router = APIRouter(prefix="/api")


@router.get("/openers")
def get_openers(request: Request, top: int = 20) -> dict:
    """The Opener leaderboard (precomputed): the best first Guesses by Expected Information."""
    if request.app.state.openers is None:
        raise NotPrecomputed(f"{OPENERS_FILE} is missing. Run `just precompute benchmark` first.")
    openers = request.app.state.openers["openers"]
    return {"total": len(openers), "openers": openers[: check_top(top)]}


@router.get("/benchmark")
def get_benchmark(request: Request) -> dict:
    """The Guess Distribution and Average Guess Count of each Benchmark Strategy (precomputed)."""
    if request.app.state.benchmark is None:
        raise NotPrecomputed(f"{BENCHMARK_FILE} is missing. Run `just precompute benchmark` first.")
    return request.app.state.benchmark
