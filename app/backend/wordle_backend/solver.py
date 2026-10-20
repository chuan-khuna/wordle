"""The package's Solver, with the one behaviour the website adds on top of it.

The engine (word lists, Feedback, the Feedback matrices, Strategy scoring) is
the `wordle` package's. This module only wraps `Solver.rank` so that, with
two or fewer Candidates left, the search switches to Candidates only
(`Solver.suggest` does that in the package, but the website calls `rank` for
lists of Suggestions).
"""

import numpy as np

from wordle.solver.strategy import Pool, Rank, Scope, Solver, WordStats


class WebSolver(Solver):
    """A `Solver` whose `rank` goes Candidates only once two or fewer Candidates are left."""

    def rank(
        self,
        candidates: np.ndarray,
        *,
        pool: Pool = "guesses",
        scope: Scope = "global",
        by: Rank = "bits",
        top: int | None = 10,
    ) -> list[WordStats]:
        # With one or two Candidates, guessing one of them is never worse.
        if 0 < len(candidates) <= 2:
            scope = "candidates"
        return super().rank(candidates, pool=pool, scope=scope, by=by, top=top)

    def is_guess(self, word: str) -> bool:
        return word in self._guess_row

    def is_answer(self, word: str) -> bool:
        return word in self._answer_column
