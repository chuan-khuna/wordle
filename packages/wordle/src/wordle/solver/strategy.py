"""Pick Suggestions by Expected Information, using the Feedback matrices.

A Guess splits the Candidate Set into groups, one per Feedback it could get
back (its Feedback Split). If the groups have sizes c₁ … cₖ out of N
Candidates, each Feedback turns up with probability p = c / N, and:

  - Expected Information = Σ p · log2(1 / p)   bits, higher is better
  - Expected Candidates  = Σ p · c = Σ c² / N   the expected size of the next
                                                 Candidate Set, lower is better

Both read straight off the counts of each Feedback Code in one matrix row,
restricted to the Candidate columns, so no Feedback is ever worked out here.

Two choices shape the search:

  - `pool`: which matrix supplies the Guesses. "answers" uses the
    Answer × Answer matrix (only Answer List words), "guesses" uses the
    Guess × Answer matrix (any word on the Guess List).
  - `scope`: "candidates" only considers words that could still be the
    Answer; "global" considers every word in the pool, which can split the
    Candidates better even though it can't Win this turn.
"""

from dataclasses import dataclass
from typing import Literal

import numpy as np

from wordle.engine.feedback import Feedback
from wordle.engine.game import State
from wordle.engine.words import WordLists, load_word_lists
from wordle.solver import matrix

type Pool = Literal["answers", "guesses"]
type Scope = Literal["candidates", "global"]
type Rank = Literal["bits", "expected"]

CODES = matrix.WIN + 1  # 243 possible Feedback Codes
ROWS_PER_STEP = 1024  # matrix rows counted per step, to keep the working arrays small


@dataclass(frozen=True)
class Strategy:
    """A named way of choosing Guesses: which Guesses to consider, and how to rank them."""

    id: str
    name: str
    pool: Pool
    scope: Scope
    by: Rank


STRATEGIES = (
    Strategy("bits-candidates", "Expected Information, Candidates only", "answers", "candidates", "bits"),
    Strategy("expected-candidates", "Expected Candidates, Candidates only", "answers", "candidates", "expected"),
    Strategy("bits-all", "Expected Information, all words", "guesses", "global", "bits"),
    Strategy("expected-all", "Expected Candidates, all words", "guesses", "global", "expected"),
)


def pack(marks: Feedback) -> int:
    """A Feedback as its Feedback Code (0 to 242)."""
    code = 0
    for mark in marks:
        code = code * 3 + mark.value
    return code


@dataclass(frozen=True)
class WordStats:
    """How one Guess would split the current Candidate Set."""

    word: str
    bits: float
    """Expected Information, in bits."""
    expected_candidates: float
    """Expected size of the Candidate Set after this Guess (Σ c² / N)."""
    groups: int
    """How many different Feedbacks the Guess can get back."""
    largest_group: int
    """The most Candidates left after the worst Feedback."""
    is_candidate: bool
    """Whether the word could be the Answer, so this Guess might Win."""
    win_chance: float
    """1 / N for a Candidate, 0 otherwise."""


def _split_counts(rows: np.ndarray, candidates: np.ndarray) -> np.ndarray:
    """A (len(rows), 243) array: how many Candidates give each Feedback Code, per row."""
    counts = np.empty((len(rows), CODES), dtype=np.int32)
    for start in range(0, len(rows), ROWS_PER_STEP):
        block = rows[start : start + ROWS_PER_STEP]
        cells = np.asarray(block[:, candidates], dtype=np.int64)  # (step, N)
        offsets = np.arange(len(block), dtype=np.int64)[:, None] * CODES
        flat = np.bincount((cells + offsets).ravel(), minlength=len(block) * CODES)
        counts[start : start + len(block)] = flat.reshape(len(block), CODES)
    return counts


def _score(counts: np.ndarray, total: int) -> tuple[np.ndarray, np.ndarray]:
    """(bits, expected Candidates) for each row of Feedback counts."""
    c = counts.astype(np.float64)
    # Σ p log2(1/p) = log2 N − Σ c log2 c / N, with 0 · log2 0 taken as 0.
    c_log_c = np.where(c > 0, c * np.log2(np.where(c > 0, c, 1)), 0.0)
    bits = np.log2(total) - c_log_c.sum(axis=1) / total
    expected = (c * c).sum(axis=1) / total
    return bits, expected


class Solver:
    """Suggestions for a State, from the two Feedback matrices.

    `answers_vs_answers` and `guesses_vs_answers` are the matrices from
    `wordle.solver.matrix`: rows are Guesses and columns are Answers, both in
    sorted word order. Candidates are kept as column numbers (indices into the
    sorted Answer List).
    """

    def __init__(
        self,
        answers_vs_answers: np.ndarray,
        guesses_vs_answers: np.ndarray,
        word_lists: WordLists | None = None,
    ) -> None:
        word_lists = word_lists or load_word_lists()
        self.answers = word_lists.answers
        self.guesses = tuple(sorted(word_lists.guesses))
        if answers_vs_answers.shape != (len(self.answers), len(self.answers)):
            raise ValueError(f"answers_vs_answers has shape {answers_vs_answers.shape}, expected Answer × Answer")
        if guesses_vs_answers.shape != (len(self.guesses), len(self.answers)):
            raise ValueError(f"guesses_vs_answers has shape {guesses_vs_answers.shape}, expected Guess × Answer")
        self.answers_vs_answers = answers_vs_answers
        self.guesses_vs_answers = guesses_vs_answers
        self._answer_column = {word: i for i, word in enumerate(self.answers)}
        self._guess_row = {word: i for i, word in enumerate(self.guesses)}
        # The Guess List row of each Answer, so a Candidate can be looked up in either matrix.
        self._guess_row_of_answer = np.array([self._guess_row[word] for word in self.answers])

    @classmethod
    def load(cls, directory=matrix.DEFAULT_DIR) -> "Solver":
        """A Solver over the matrices saved in `directory`, building them first if missing."""
        return cls(*matrix.load(directory))

    # The Candidate Set

    def all_candidates(self) -> np.ndarray:
        return np.arange(len(self.answers))

    def narrow(self, candidates: np.ndarray, guess: str, code: int) -> np.ndarray:
        """The Candidates that would have given Feedback Code `code` for `guess`."""
        row = self.guesses_vs_answers[self._guess_row[guess]]
        return candidates[row[candidates] == code]

    def codes(self, guess: str, candidates: np.ndarray) -> np.ndarray:
        """The Feedback Code `guess` gets against each Candidate."""
        return self.guesses_vs_answers[self._guess_row[guess]][candidates]

    def candidates(self, state: State) -> np.ndarray:
        """The Candidate Set for a State: every Answer that fits all its Feedback."""
        candidates = self.all_candidates()
        for guess in state:
            candidates = self.narrow(candidates, guess.word, pack(guess.feedback))
        return candidates

    def words(self, candidates: np.ndarray) -> list[str]:
        return [self.answers[i] for i in candidates]

    # Scoring

    def _pool_rows(self, pool: Pool, scope: Scope, candidates: np.ndarray) -> tuple[np.ndarray, list[str]]:
        """The matrix and the words of the Guesses to consider, row for row."""
        if pool == "answers":
            if scope == "candidates":
                return self.answers_vs_answers[candidates], self.words(candidates)
            return self.answers_vs_answers, list(self.answers)
        if scope == "candidates":
            return self.guesses_vs_answers[self._guess_row_of_answer[candidates]], self.words(candidates)
        return self.guesses_vs_answers, list(self.guesses)

    def rank(
        self,
        candidates: np.ndarray,
        *,
        pool: Pool = "guesses",
        scope: Scope = "global",
        by: Rank = "bits",
        top: int | None = 10,
    ) -> list[WordStats]:
        """The best Guesses for this Candidate Set, best first, with their stats.

        `by="bits"` puts the most Expected Information first; `by="expected"`
        puts the smallest expected next Candidate Set first. Ties go to a
        Candidate (it might Win now), then to the other measure, then to
        alphabetical order.
        """
        if len(candidates) == 0:
            return []
        rows, words = self._pool_rows(pool, scope, candidates)
        counts = _split_counts(rows, candidates)
        bits, expected = _score(counts, len(candidates))
        is_candidate = np.zeros(len(words), dtype=bool)
        if scope == "candidates":
            is_candidate[:] = True
        else:
            candidate_set = {self.answers[i] for i in candidates}
            is_candidate = np.array([word in candidate_set for word in words])

        # np.lexsort sorts by the last key first. Round so float noise doesn't break ties.
        bits_key, expected_key = np.round(bits, 9), np.round(expected, 9)
        primary, secondary = (-bits_key, expected_key) if by == "bits" else (expected_key, -bits_key)
        order = np.lexsort((np.arange(len(words)), secondary, ~is_candidate, primary))
        if top is not None:
            order = order[:top]
        n = len(candidates)
        return [
            WordStats(
                word=words[i],
                bits=float(bits[i]),
                expected_candidates=float(expected[i]),
                groups=int((counts[i] > 0).sum()),
                largest_group=int(counts[i].max()),
                is_candidate=bool(is_candidate[i]),
                win_chance=1 / n if is_candidate[i] else 0.0,
            )
            for i in order
        ]

    def suggest(
        self,
        candidates: np.ndarray,
        *,
        pool: Pool = "guesses",
        scope: Scope = "global",
        by: Rank = "bits",
    ) -> WordStats | None:
        """The Suggestion: the top-ranked Guess, or None if no Candidate is left."""
        # With one or two Candidates, guessing one of them is never worse.
        if 0 < len(candidates) <= 2:
            scope = "candidates"
        best = self.rank(candidates, pool=pool, scope=scope, by=by, top=1)
        return best[0] if best else None

    def stats(self, word: str, candidates: np.ndarray) -> WordStats:
        """How `word` would split this Candidate Set. Any Guess List word works."""
        word = word.strip().lower()
        if word not in self._guess_row:
            raise ValueError(f"{word!r} is not on the Guess List")
        if len(candidates) == 0:
            raise ValueError("the Candidate Set is empty")
        rows = self.guesses_vs_answers[[self._guess_row[word]]]
        counts = _split_counts(rows, candidates)
        bits, expected = _score(counts, len(candidates))
        is_candidate = word in self._answer_column and self._answer_column[word] in set(candidates.tolist())
        return WordStats(
            word=word,
            bits=float(bits[0]),
            expected_candidates=float(expected[0]),
            groups=int((counts[0] > 0).sum()),
            largest_group=int(counts[0].max()),
            is_candidate=is_candidate,
            win_chance=1 / len(candidates) if is_candidate else 0.0,
        )

    def split(self, word: str, candidates: np.ndarray) -> dict[int, list[str]]:
        """The Feedback Split of `word`: Candidates grouped by the Feedback Code they'd give."""
        row = self.guesses_vs_answers[self._guess_row[word.strip().lower()]]
        groups: dict[int, list[str]] = {}
        for i in candidates:
            groups.setdefault(int(row[i]), []).append(self.answers[i])
        return dict(sorted(groups.items(), key=lambda item: -len(item[1])))
