//! Precompute the Feedback of every Guess against every Answer, the same two matrices as the
//! Python package's `wordle/solver/matrix.py` writes, in the same `.npy` files:
//!
//! - `answers_vs_answers.npy`: Answer List × Answer List (2,315 × 2,315)
//! - `guesses_vs_answers.npy`: Guess List × Answer List (14,855 × 2,315)
//!
//! Rows are Guesses and columns are Answers, both in sorted order. Each cell is one Feedback
//! packed into a `u8`: the five Marks (Absent 0, Present 1, Correct 2) as base-3 digits, first
//! letter first, so a Win is 242. See `docs/documents/feedback-matrices.md`.

use std::io;
use std::path::{Path, PathBuf};
use std::thread;

use crate::engine::words::{WORD_LENGTH, word_lists};

/// The cell for a Guess that is the Answer: every letter Correct (3⁵ - 1).
pub const WIN: u8 = 242;

pub const ANSWERS_FILE: &str = "answers_vs_answers.npy";
pub const GUESSES_FILE: &str = "guesses_vs_answers.npy";

/// The thread counts the app offers.
pub const THREAD_CHOICES: [usize; 4] = [1, 2, 4, 8];

/// Where the matrices go: `precompute-cache/feedback-rust/` at the repo root, a folder of its own; the Python package
/// and the backend use `precompute-cache/feedback/`, the same files byte for byte, so either can be copied over the other.
pub fn default_dir() -> PathBuf {
    let repo_root = Path::new(env!("CARGO_MANIFEST_DIR")).ancestors().nth(2).expect("the app is two folders below the repo root");
    repo_root.join("precompute-cache").join("feedback-rust")
}

type Letters = [u8; WORD_LENGTH];

fn letters(word: &str) -> Letters {
    word.as_bytes().try_into().expect("a word on the lists has five letters")
}

/// The packed Feedback of `guess` against `answer` (lowercase ASCII letters), by the same
/// two-pass rule as `feedback::feedback`, without allocating.
pub fn pack(guess: &Letters, answer: &Letters) -> u8 {
    let mut marks = [0u8; WORD_LENGTH]; // 0 Absent, 1 Present, 2 Correct
    let mut unused = [0u8; 26]; // the Answer's letters that pass 1 didn't use up

    // Pass 1: a letter in exactly the right position is Correct.
    for i in 0..WORD_LENGTH {
        if guess[i] == answer[i] {
            marks[i] = 2;
        } else {
            unused[(answer[i] - b'a') as usize] += 1;
        }
    }
    // Pass 2: a non-Correct letter is Present if an unused copy is left.
    for i in 0..WORD_LENGTH {
        if marks[i] == 0 {
            let left = &mut unused[(guess[i] - b'a') as usize];
            if *left > 0 {
                marks[i] = 1;
                *left -= 1;
            }
        }
    }
    marks.iter().fold(0, |code, mark| code * 3 + mark)
}

/// The packed Feedback of each Guess (row) against each Answer (column), row by row. With more
/// than one thread the rows are split into blocks, one for each thread; the blocks don't overlap,
/// so no thread touches another's cells.
pub fn score_matrix(guesses: &[&str], answers: &[&str], threads: usize) -> Vec<u8> {
    let guesses: Vec<Letters> = guesses.iter().map(|word| letters(word)).collect();
    let answers: Vec<Letters> = answers.iter().map(|word| letters(word)).collect();
    let mut matrix = vec![0u8; guesses.len() * answers.len()];
    if matrix.is_empty() {
        return matrix;
    }

    let rows_per_thread = guesses.len().div_ceil(threads.max(1));
    thread::scope(|scope| {
        let blocks = matrix.chunks_mut(rows_per_thread * answers.len()).zip(guesses.chunks(rows_per_thread));
        for (cells, rows) in blocks {
            let answers = &answers;
            scope.spawn(move || {
                for (row, guess) in cells.chunks_mut(answers.len()).zip(rows) {
                    for (cell, answer) in row.iter_mut().zip(answers) {
                        *cell = pack(guess, answer);
                    }
                }
            });
        }
    });
    matrix
}

/// The bytes of a `.npy` file (format 1.0) holding a 2D `u8` array of `rows` × `cols`, row by row.
/// The header is padded to a multiple of 64 bytes, as numpy does, so numpy and the Python
/// package's `np.load(..., mmap_mode="r")` read it.
pub fn npy_bytes(rows: usize, cols: usize, cells: &[u8]) -> Vec<u8> {
    assert_eq!(rows * cols, cells.len());
    let mut bytes = npy_header(rows, cols);
    bytes.extend_from_slice(cells);
    bytes
}

/// The header that `npy_bytes` puts before the cells: magic, version, length and the padded dict.
pub fn npy_header(rows: usize, cols: usize) -> Vec<u8> {
    let mut header = format!("{{'descr': '|u1', 'fortran_order': False, 'shape': ({rows}, {cols}), }}");
    // Magic (6) + version (2) + header length (2) + the header and its closing newline.
    let unpadded = 10 + header.len() + 1;
    header.push_str(&" ".repeat(unpadded.next_multiple_of(64) - unpadded));
    header.push('\n');

    let mut bytes = Vec::with_capacity(10 + header.len());
    bytes.extend_from_slice(b"\x93NUMPY\x01\x00");
    bytes.extend_from_slice(&(header.len() as u16).to_le_bytes());
    bytes.extend_from_slice(header.as_bytes());
    bytes
}

/// Score every pair on `threads` threads and write both matrices into `directory` (made if
/// missing, files replaced). Returns the two paths: answers-vs-answers, then guesses-vs-answers.
pub fn build(directory: &Path, threads: usize) -> io::Result<(PathBuf, PathBuf)> {
    let lists = word_lists();
    let answers = &lists.answers;
    let mut guesses: Vec<&str> = lists.guesses.iter().copied().collect();
    guesses.sort_unstable();

    let guesses_vs_answers = score_matrix(&guesses, answers, threads);

    // Each Answer's row of the Guess matrix: the Answer List is inside the Guess List.
    let mut answers_vs_answers = Vec::with_capacity(answers.len() * answers.len());
    for answer in answers {
        let row = guesses.binary_search(answer).expect("the Guess List contains every Answer");
        answers_vs_answers.extend_from_slice(&guesses_vs_answers[row * answers.len()..(row + 1) * answers.len()]);
    }

    std::fs::create_dir_all(directory)?;
    let answers_path = directory.join(ANSWERS_FILE);
    let guesses_path = directory.join(GUESSES_FILE);
    std::fs::write(&answers_path, npy_bytes(answers.len(), answers.len(), &answers_vs_answers))?;
    std::fs::write(&guesses_path, npy_bytes(guesses.len(), answers.len(), &guesses_vs_answers))?;
    Ok((answers_path, guesses_path))
}

#[cfg(test)]
#[path = "matrix_tests.rs"]
mod tests;
