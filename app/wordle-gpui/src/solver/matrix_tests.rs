use super::*;
use crate::engine::feedback::{Mark, feedback};

fn pack_marks(marks: &[Mark]) -> u8 {
    marks.iter().fold(0, |code, mark| code * 3 + *mark as u8)
}

#[test]
fn cells_match_the_python_examples() {
    // The worked examples in docs/documents/feedback-matrices.md.
    for (guess, answer, cell) in [("crane", "cable", 173), ("speed", "abide", 10), ("crane", "zonal", 12), ("crane", "crane", WIN)] {
        assert_eq!(pack(&letters(guess), &letters(answer)), cell, "{guess} vs {answer}");
    }
}

#[test]
fn pack_agrees_with_feedback_on_tricky_words() {
    let words = ["speed", "abide", "lllll", "hello", "eerie", "crane", "bbaaa", "aabbb", "cable", "geese", "theme"];
    for guess in words {
        for answer in words {
            assert_eq!(pack(&letters(guess), &letters(answer)), pack_marks(&feedback(guess, answer)), "{guess} vs {answer}");
        }
    }
}

#[test]
fn pack_agrees_with_feedback_on_the_word_lists() {
    let lists = word_lists();
    let mut guesses: Vec<&str> = lists.guesses.iter().copied().collect();
    guesses.sort_unstable();
    for guess in guesses.iter().step_by(37) {
        for answer in lists.answers.iter().step_by(11) {
            assert_eq!(pack(&letters(guess), &letters(answer)), pack_marks(&feedback(guess, answer)), "{guess} vs {answer}");
        }
    }
}

#[test]
fn threads_give_the_same_matrix() {
    let lists = word_lists();
    let guesses: Vec<&str> = lists.answers.iter().copied().take(101).collect();
    let answers: Vec<&str> = lists.answers.iter().copied().take(50).collect();
    let one = score_matrix(&guesses, &answers, 1);
    for threads in THREAD_CHOICES {
        assert_eq!(score_matrix(&guesses, &answers, threads), one, "{threads} threads");
    }
}

#[test]
fn an_npy_header_is_padded_to_64_bytes_and_ends_in_a_newline() {
    let bytes = npy_bytes(2, 3, &[1, 2, 3, 4, 5, 6]);
    assert_eq!(&bytes[..8], b"\x93NUMPY\x01\x00");
    let header_len = u16::from_le_bytes([bytes[8], bytes[9]]) as usize;
    assert_eq!((10 + header_len) % 64, 0);
    let header = std::str::from_utf8(&bytes[10..10 + header_len]).unwrap();
    assert!(header.starts_with("{'descr': '|u1', 'fortran_order': False, 'shape': (2, 3), }"));
    assert!(header.ends_with('\n'));
    assert_eq!(&bytes[10 + header_len..], [1, 2, 3, 4, 5, 6]);
}

#[test]
fn build_writes_both_matrices() {
    let directory = std::env::temp_dir().join(format!("wordle-gpui-matrices-{}", std::process::id()));
    let (answers_path, guesses_path) = build(&directory, 4).unwrap();
    let lists = word_lists();
    let n = lists.answers.len();
    let answers_file = std::fs::read(&answers_path).unwrap();
    let guesses_file = std::fs::read(&guesses_path).unwrap();
    // 128-byte header (as the Python package writes), then one byte per cell.
    assert_eq!(answers_file.len(), 128 + n * n);
    assert_eq!(guesses_file.len(), 128 + lists.guesses.len() * n);
    // An Answer against itself is a Win.
    assert!((0..n).all(|i| answers_file[128 + i * n + i] == WIN));
    std::fs::remove_dir_all(&directory).ok();
}
