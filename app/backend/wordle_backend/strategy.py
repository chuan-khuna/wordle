"""Rank Guesses by Expected Information or Expected Candidates, from the Feedback matrices.

The same maths and tie-breaks as the Python package's Solver (see
docs/documents/solver-strategy.md), written again here so this project stays
standalone. A Guess splits the Candidate Set into groups, one per Feedback it
could get back. With group sizes c₁ … cₖ out of N Candidates (p = c / N):

  - Expected Information = Σ p · log2(1 / p)   bits, higher is better
  - Expected Candidates  = Σ c² / N            lower is better

Both are read off the counts of each Feedback Code in one matrix row,
restricted to the Candidate columns.
"""

from dataclasses import dataclass
from typing import Literal

import numpy as np

from wordle_backend.feedback import WIN
from wordle_backend.words import load_word_lists

type Pool = Literal["answers", "guesses"]
type Scope = Literal["candidates", "global"]
type By = Literal["bits", "expected"]

CODES = WIN + 1  # 243 possible Feedback Codes
ROWS_PER_STEP = 1024  # matrix rows counted per step, to keep the working arrays small


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


class Strategy:
    """Suggestions for a Candidate Set, from the two Feedback matrices.

    `answers_vs_answers` and `guesses_vs_answers` are the matrices from
    `wordle_backend.matrices`: rows are Guesses and columns are Answers, both in
    sorted word order. Candidates are column numbers (indices into the Answer List).
    """

    def __init__(self, answers_vs_answers: np.ndarray, guesses_vs_answers: np.ndarray) -> None:
        lists = load_word_lists()
        self.answers = lists.answers
        self.guesses = lists.guesses
        if answers_vs_answers.shape != (len(self.answers), len(self.answers)):
            raise ValueError(f"answers_vs_answers has shape {answers_vs_answers.shape}, expected Answer × Answer")
        if guesses_vs_answers.shape != (len(self.guesses), len(self.answers)):
            raise ValueError(f"guesses_vs_answers has shape {guesses_vs_answers.shape}, expected Guess × Answer")
        self.answers_vs_answers = answers_vs_answers
        self.guesses_vs_answers = guesses_vs_answers
        self.answer_column = {word: i for i, word in enumerate(self.answers)}
        self.guess_row = {word: i for i, word in enumerate(self.guesses)}
        # The Guess List row of each Answer, so a Candidate can be looked up in either matrix.
        self.guess_row_of_answer = np.array([self.guess_row[word] for word in self.answers])

    # The Candidate Set

    def all_candidates(self) -> np.ndarray:
        return np.arange(len(self.answers))

    def narrow(self, candidates: np.ndarray, guess: str, code: int) -> np.ndarray:
        """The Candidates that would have given Feedback Code `code` for `guess`."""
        row = self.guesses_vs_answers[self.guess_row[guess]]
        return candidates[row[candidates] == code]

    def words(self, candidates: np.ndarray) -> list[str]:
        return [self.answers[i] for i in candidates]

    # Scoring

    def _pool_rows(self, pool: Pool, scope: Scope, candidates: np.ndarray) -> tuple[np.ndarray, list[str]]:
        """The matrix rows and the words of the Guesses to consider, row for row."""
        if pool == "answers":
            if scope == "candidates":
                return self.answers_vs_answers[candidates], self.words(candidates)
            return self.answers_vs_answers, list(self.answers)
        if scope == "candidates":
            return self.guesses_vs_answers[self.guess_row_of_answer[candidates]], self.words(candidates)
        return self.guesses_vs_answers, list(self.guesses)

    def rank(
        self,
        candidates: np.ndarray,
        *,
        pool: Pool = "guesses",
        scope: Scope = "global",
        by: By = "bits",
        top: int | None = 10,
    ) -> list[WordStats]:
        """The best Guesses for this Candidate Set, best first, with their stats.

        `by="bits"` puts the most Expected Information first; `by="expected"`
        puts the smallest expected next Candidate Set first. Ties go to a
        Candidate (it might Win now), then to the other measure, then to
        alphabetical order. With two or fewer Candidates left the search is
        Candidates only, whatever `scope` says: guessing one is never worse.
        """
        if len(candidates) == 0:
            return []
        if len(candidates) <= 2:
            scope = "candidates"
        rows, words = self._pool_rows(pool, scope, candidates)
        counts = _split_counts(rows, candidates)
        bits, expected = _score(counts, len(candidates))
        if scope == "candidates":
            is_candidate = np.ones(len(words), dtype=bool)
        else:
            candidate_words = set(self.words(candidates))
            is_candidate = np.array([word in candidate_words for word in words])

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

    def stats(self, word: str, candidates: np.ndarray) -> WordStats:
        """How `word` (any Guess List word) would split this Candidate Set."""
        rows = self.guesses_vs_answers[[self.guess_row[word]]]
        counts = _split_counts(rows, candidates)
        bits, expected = _score(counts, len(candidates))
        column = self.answer_column.get(word)
        is_candidate = column is not None and column in set(candidates.tolist())
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
        """The Feedback Split of `word`: Candidates grouped by Feedback Code, biggest group first."""
        row = self.guesses_vs_answers[self.guess_row[word]]
        groups: dict[int, list[str]] = {}
        for i in candidates:
            groups.setdefault(int(row[i]), []).append(self.answers[i])
        return dict(sorted(groups.items(), key=lambda item: -len(item[1])))
