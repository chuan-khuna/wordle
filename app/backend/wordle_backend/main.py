"""The FastAPI app (`uvicorn wordle_backend.main:app`): Feedback, Candidates, Feedback Splits, Suggestions, step-through Games, the Benchmark, Openers and Guess Counts.

The endpoints live in `routers/`, one module per area. Bad input gets HTTP 400
and `{"detail": "<message>"}`, never FastAPI's default 422.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from wordle.solver import benchmark, guess_count_matrix
from wordle.solver.matrix import ANSWERS_FILE, DEFAULT_DIR, GUESSES_FILE
from wordle_backend.common import BadRequest, NotPrecomputed
from wordle_backend.routers import benchmark as benchmark_router
from wordle_backend.routers import candidates, feedback, guess_counts, solve, suggestions
from wordle_backend.solver import WebSolver


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Memory-map the Feedback matrices once. They are never built here: that takes seconds."""
    missing = [name for name in (ANSWERS_FILE, GUESSES_FILE) if not (DEFAULT_DIR / name).exists()]
    if missing:
        raise RuntimeError(
            f"Feedback matrices missing in {DEFAULT_DIR} ({', '.join(missing)}). "
            "Run `just precompute` first."
        )
    app.state.solver = WebSolver.load(DEFAULT_DIR)
    # The Benchmark files are optional: without them only those two endpoints answer 503.
    app.state.benchmark, app.state.openers = benchmark.load()
    # So is the Guess Count Matrix summary: without it only /api/guess-counts answers 503.
    app.state.guess_counts = guess_count_matrix.load_summary()
    yield


app = FastAPI(title="Wordle backend", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)  # /api/guess-counts is about 15k entries

for router_module in (feedback, candidates, suggestions, solve, benchmark_router, guess_counts):
    app.include_router(router_module.router)


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
