"""Play every Answer at once, as a tree, to get each one's Guess Count.

A Game is a Strategy's Guesses against one Answer, starting from an Opener.
Every Answer that has got the same Feedback so far shares a Candidate Set, and
so the same next Guess, so the Answers are played together: one Guess per node
of the tree instead of one per Game. The results are the same as playing each
Game alone.

The next Guess depends only on the Candidate Set (for a given Strategy), not on
the Opener or the Guesses before it, so different Openers reach many of the same
Candidate Sets. A `NextGuessCache` keeps those Guesses so that playing many
Openers (the Guess Count Matrix does) does the search for each Candidate Set once.
"""

import numpy as np

from wordle.solver.matrix import WIN
from wordle.solver.strategy import Solver, Strategy

SAFETY_LIMIT = 12  # no Strategy needs more than 8 Guesses; this only stops a runaway
UNSOLVED = SAFETY_LIMIT + 1  # the Guess Count of an Answer still unsolved at the limit: a Loss anyway


class NextGuessCache:
    """The next Guess for a Candidate Set, per Strategy, shared by every tree play given it.

    Thread safety: a plain dict. A single `get` or `[]=` is atomic under the GIL,
    so the dict is never corrupted. There is no lock: two threads that miss on the
    same Candidate Set both do the search and store the same word (the search is
    deterministic), which wastes a little work but is harmless.
    """

    def __init__(self) -> None:
        self._guesses: dict[tuple[Strategy, bytes], str] = {}

    def next_guess(self, solver: Solver, how: Strategy, candidates: np.ndarray) -> str:
        """The word `how` guesses for this Candidate Set (searching only on a miss)."""
        key = (how, candidates.tobytes())
        guess = self._guesses.get(key)
        if guess is None:
            guess = solver.suggest(candidates, pool=how.pool, scope=how.scope, by=how.by).word
            self._guesses[key] = guess
        return guess

    def __len__(self) -> int:
        return len(self._guesses)


def guess_counts(
    solver: Solver, how: Strategy, opener: str, cache: NextGuessCache | None = None
) -> np.ndarray:
    """The Guess Count of every Answer, in Answer List order: its Game played with `how` from `opener`.

    An Answer still unsolved after `SAFETY_LIMIT` Guesses gets `UNSOLVED`.
    Pass a `cache` to share next-Guess work with other calls (any Opener, any thread).
    """
    if cache is None:
        cache = NextGuessCache()
    counts = np.zeros(len(solver.answers), dtype=np.int16)
    # Each node is (Candidate Set, Guess to play, its number). Every Answer in the set is still unsolved.
    pending = [(solver.all_candidates(), opener, 1)]
    while pending:
        candidates, guess, number = pending.pop()
        codes = solver.codes(guess, candidates)
        for code in np.unique(codes):
            group = candidates[codes == code]
            if code == WIN:
                counts[group] = number
            elif number >= SAFETY_LIMIT:
                counts[group] = UNSOLVED
            else:
                pending.append((group, cache.next_guess(solver, how, group), number + 1))
    return counts
