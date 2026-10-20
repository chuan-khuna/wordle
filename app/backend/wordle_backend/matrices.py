"""Precompute the Feedback of every Guess against every Answer.

Two matrices, rows are Guesses and columns are Answers, both in sorted order:

  - answers_vs_answers.npy:  Answer List  x Answer List   (2,315 x 2,315)
  - guesses_vs_answers.npy:  Guess List   x Answer List   (14,855 x 2,315)

Each cell is a Feedback Code (0 to 242, see feedback.py). The files are
byte-identical to the ones the Python package and the gpui app write.
"""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

from wordle_backend.feedback import CORRECT
from wordle_backend.words import WORD_LENGTH, load_word_lists

DEFAULT_DIR = Path(__file__).resolve().parents[1] / "matrices"
ANSWERS_FILE = "answers_vs_answers.npy"
GUESSES_FILE = "guesses_vs_answers.npy"

CHUNK = 256  # Guesses scored per step, to keep the working arrays small


def _letters(words: tuple[str, ...]) -> np.ndarray:
    """The words as a (words, 5) array of letter codes."""
    return np.array([[ord(letter) for letter in word] for word in words], dtype=np.uint8)


def _score_block(
    guess_letters: np.ndarray, answer_letters: np.ndarray, result: np.ndarray, start: int
) -> None:
    """Score `guess_letters` (a (chunk, 5) block) into `result` from row `start`."""
    block = guess_letters[:, None, :]  # (chunk, 1, 5)

    # Pass 1: a letter in the right position is Correct.
    correct = block == answer_letters  # (chunk, answers, 5)

    # Pass 2: a non-Correct letter is Present while the Answer still has an
    # unused copy. Earlier copies in the Guess use them up first, so position i
    # is Present when fewer non-Correct copies of its letter sit before it than
    # the Answer has non-Correct copies in total.
    present = np.zeros_like(correct)
    for i in range(WORD_LENGTH):
        letter = block[:, :, i : i + 1]  # (chunk, 1, 1)
        unused_in_answer = ((answer_letters == letter) & ~correct).sum(axis=2)
        used_before = ((block[:, :, :i] == letter) & ~correct[:, :, :i]).sum(axis=2)
        present[:, :, i] = ~correct[:, :, i] & (used_before < unused_in_answer)

    marks = np.where(correct, CORRECT, present.astype(np.uint8))  # (chunk, answers, 5)
    code = np.zeros(marks.shape[:2], dtype=np.uint16)
    for i in range(WORD_LENGTH):
        code = code * 3 + marks[:, :, i]
    result[start : start + len(guess_letters)] = code


def score_matrix(
    guesses: tuple[str, ...], answers: tuple[str, ...], threads: int = 1
) -> np.ndarray:
    """The Feedback Code of each Guess (row) against each Answer (column).

    The same two-pass rule as `feedback.feedback`, done for a block of Guesses
    at once. With `threads` above 1 the blocks are scored in parallel: numpy
    lets go of the GIL inside its array operations, and each block writes its
    own rows, so the threads never touch the same cells.
    """
    answer_letters = _letters(answers)[None, :, :]  # (1, answers, 5)
    guess_letters = _letters(guesses)
    result = np.empty((len(guesses), len(answers)), dtype=np.uint8)

    with ThreadPoolExecutor(max_workers=threads) as pool:
        futures = [
            pool.submit(_score_block, guess_letters[start : start + CHUNK], answer_letters, result, start)
            for start in range(0, len(guesses), CHUNK)
        ]
        for future in futures:
            future.result()  # re-raise any error from a worker
    return result


def build(directory: Path = DEFAULT_DIR, threads: int = 1) -> tuple[Path, Path]:
    """Write both matrices into `directory` and return their paths."""
    words = load_word_lists()
    directory.mkdir(parents=True, exist_ok=True)

    guesses_vs_answers = score_matrix(words.guesses, words.answers, threads)
    row_of = {word: row for row, word in enumerate(words.guesses)}
    answers_vs_answers = guesses_vs_answers[[row_of[word] for word in words.answers]]

    answers_path = directory / ANSWERS_FILE
    guesses_path = directory / GUESSES_FILE
    np.save(answers_path, answers_vs_answers)
    np.save(guesses_path, guesses_vs_answers)
    return answers_path, guesses_path


def load(directory: Path = DEFAULT_DIR) -> tuple[np.ndarray, np.ndarray]:
    """Memory-map (answers_vs_answers, guesses_vs_answers), building them first if missing."""
    if not (directory / ANSWERS_FILE).exists() or not (directory / GUESSES_FILE).exists():
        build(directory)
    return (
        np.load(directory / ANSWERS_FILE, mmap_mode="r"),
        np.load(directory / GUESSES_FILE, mmap_mode="r"),
    )
