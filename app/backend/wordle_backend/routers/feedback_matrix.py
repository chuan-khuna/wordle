"""`GET /api/feedback-matrix`: the Answer × Answer Feedback Matrix as raw bytes, for the website's Feedback Matrix page.

The body is the `.npy` file's cells with its header stripped: 2,315 × 2,315 `uint8` Feedback Codes, row by row,
rows Guesses and columns Answers, both in sorted Answer List order (the website's build-time Answer List is sorted
the same way). It is read and gzipped once, on the first request, and cached on `app.state`.
"""

import gzip

import numpy as np
from fastapi import APIRouter, Request, Response

from wordle.solver.matrix import ANSWERS_FILE
from wordle_backend.common import NotPrecomputed, solver_of

router = APIRouter(prefix="/api")

# The cells never change while the backend runs (a new matrix needs a restart), so browsers may keep them.
CACHE_CONTROL = "public, max-age=604800, immutable"


def matrix_bytes(request: Request) -> tuple[bytes, bytes]:
    """The matrix's cells, raw and gzipped, read once from `app.state.feedback_matrix_file`."""
    state = request.app.state
    cached = getattr(state, "feedback_matrix", None)
    if cached is not None:
        return cached
    path = state.feedback_matrix_file
    if not path.exists():
        raise NotPrecomputed(f"{ANSWERS_FILE} is missing. Run `just precompute feedback` first.")
    cells = np.load(path, mmap_mode="r")
    size = len(solver_of(request).answers)
    if cells.dtype != np.uint8 or cells.shape != (size, size):
        raise NotPrecomputed(f"{ANSWERS_FILE} is not a {size} × {size} uint8 matrix. Run `just precompute feedback` again.")
    raw = np.ascontiguousarray(cells).tobytes()
    state.feedback_matrix = (raw, gzip.compress(raw, compresslevel=6, mtime=0))
    return state.feedback_matrix


@router.get("/feedback-matrix")
def get_feedback_matrix(request: Request) -> Response:
    """Every Feedback Code of the Answer × Answer Feedback Matrix, row by row (rows Guesses, columns Answers)."""
    raw, packed = matrix_bytes(request)
    headers = {"Cache-Control": CACHE_CONTROL, "Vary": "Accept-Encoding"}
    if "gzip" in request.headers.get("accept-encoding", "").lower():
        return Response(packed, media_type="application/octet-stream", headers={**headers, "Content-Encoding": "gzip"})
    return Response(raw, media_type="application/octet-stream", headers=headers)
