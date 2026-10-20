use std::sync::OnceLock;

use super::*;
use crate::engine::feedback::feedback;
use crate::solver::matrix::{build, score_matrix};

/// The Answers matrix, scored once for all the tests.
fn answers_matrix() -> &'static Matrix {
    static MATRIX: OnceLock<Matrix> = OnceLock::new();
    MATRIX.get_or_init(|| {
        let answers = word_lists().answers.clone();
        let cells = score_matrix(&answers, &answers, 4);
        Matrix::new(answers.clone(), answers, cells)
    })
}

/// The Valid guesses matrix.
fn valid_matrix() -> &'static Matrix {
    static MATRIX: OnceLock<Matrix> = OnceLock::new();
    MATRIX.get_or_init(|| {
        let mut guesses: Vec<&'static str> = word_lists().guesses.iter().copied().collect();
        guesses.sort_unstable();
        let answers = word_lists().answers.clone();
        let cells = score_matrix(&guesses, &answers, 4);
        Matrix::new(guesses, answers, cells)
    })
}

fn all_candidates() -> Vec<usize> {
    (0..word_lists().answers.len()).collect()
}

#[test]
fn expected_information_is_the_entropy_of_the_split() {
    let close = |(bits, left): (f64, f64), want_bits: f64, want_left: f64| (bits - want_bits).abs() < 1e-9 && (left - want_left).abs() < 1e-9;
    // Four equally likely Feedbacks: 2 bits, and each leaves one Candidate.
    assert!(close(split_stats([1u8, 2, 3, 4].into_iter(), 4), 2.0, 1.0));
    // Two groups of two: 1 bit, two Candidates left.
    assert!(close(split_stats([7u8, 7, 9, 9].into_iter(), 4), 1.0, 2.0));
    // Everyone gets the same Feedback: nothing learned.
    assert!(close(split_stats([5u8, 5, 5, 5].into_iter(), 4), 0.0, 4.0));
    // 3 in one group and 1 alone: -(3/4)log2(3/4) - (1/4)log2(1/4).
    let (bits, left) = split_stats([1u8, 1, 1, 2].into_iter(), 4);
    assert!((bits - 0.811_278_124).abs() < 1e-6 && (left - 2.5).abs() < 1e-9);
}

#[test]
fn candidates_keep_only_the_answers_that_fit_every_feedback() {
    let answers = &word_lists().answers;
    let state: Vec<(&str, Vec<Mark>)> = vec![("crane", feedback("crane", "cable")), ("slate", feedback("slate", "cable"))];
    let left = candidates(state.iter().map(|(word, marks)| (*word, marks.as_slice())));
    assert!(left.iter().any(|&index| answers[index] == "cable"));
    assert!(left.len() < 50);
    for &index in &left {
        assert_eq!(feedback("crane", answers[index]), state[0].1);
        assert_eq!(feedback("slate", answers[index]), state[1].1);
    }
    // No Guesses yet: every Answer is a Candidate.
    assert_eq!(candidates(std::iter::empty()).len(), answers.len());
}

#[test]
fn the_opener_is_ranked_best_first() {
    let top = suggest(answers_matrix(), &all_candidates(), SearchMode::Candidates, 10);
    assert_eq!(top.len(), 10);
    assert!(top.windows(2).all(|pair| pair[0].bits >= pair[1].bits - 1e-9));
    // A first Guess on 2,315 Answers can tell us somewhere between 5 and 7 bits.
    assert!((5.0..7.0).contains(&top[0].bits), "{:?}", top[0]);
    // Candidates mode only suggests words that could be the Answer.
    assert!(top.iter().all(|suggestion| suggestion.is_candidate));
}

#[test]
fn searching_everything_never_does_worse_than_searching_candidates() {
    let candidates_only = suggest(answers_matrix(), &all_candidates(), SearchMode::Candidates, 1)[0].bits;
    let everything_answers = suggest(answers_matrix(), &all_candidates(), SearchMode::Everything, 1)[0].bits;
    let everything_valid = suggest(valid_matrix(), &all_candidates(), SearchMode::Everything, 1)[0].bits;
    assert!(everything_answers >= candidates_only - 1e-9);
    // More words to choose from can only help.
    assert!(everything_valid >= everything_answers - 1e-9);
}

#[test]
fn candidates_mode_on_the_valid_matrix_matches_the_answers_matrix() {
    // Same words tried, so the same ranking, whichever matrix they are read from.
    let from_answers = suggest(answers_matrix(), &all_candidates(), SearchMode::Candidates, 5);
    let from_valid = suggest(valid_matrix(), &all_candidates(), SearchMode::Candidates, 5);
    assert_eq!(from_answers, from_valid);
}

#[test]
fn a_single_candidate_is_the_suggestion() {
    let answers = &word_lists().answers;
    let only = answers.iter().position(|&word| word == "cable").unwrap();
    for mode in [SearchMode::Candidates, SearchMode::Everything] {
        let top = suggest(valid_matrix(), &[only], mode, 3);
        assert_eq!(top[0].word, "cable", "{mode:?}");
        assert!(top[0].is_candidate);
        assert_eq!(top[0].bits, 0.0);
    }
    assert!(suggest(valid_matrix(), &[], SearchMode::Everything, 3).is_empty());
}

#[test]
fn a_matrix_written_by_build_loads_back() {
    let directory = std::env::temp_dir().join(format!("wordle-gpui-solver-{}", std::process::id()));
    build(&directory, 4).unwrap();
    for set in MatrixSet::ALL {
        let loaded = Matrix::load(&directory, set).unwrap();
        let built = match set {
            MatrixSet::Answers => answers_matrix(),
            MatrixSet::ValidGuesses => valid_matrix(),
        };
        assert_eq!(loaded.cells, built.cells, "{set:?}");
        assert_eq!(loaded.rows, built.rows);
    }
    std::fs::remove_dir_all(&directory).ok();
}

#[test]
fn a_missing_or_stale_matrix_is_an_error() {
    let directory = std::env::temp_dir().join(format!("wordle-gpui-solver-missing-{}", std::process::id()));
    let error = Matrix::load(&directory, MatrixSet::Answers).err().unwrap();
    assert_eq!(error.kind(), io::ErrorKind::NotFound);

    std::fs::create_dir_all(&directory).unwrap();
    std::fs::write(directory.join(ANSWERS_FILE), crate::solver::matrix::npy_bytes(2, 2, &[0; 4])).unwrap();
    let error = Matrix::load(&directory, MatrixSet::Answers).err().unwrap();
    assert!(error.to_string().contains("Precompute"), "{error}");
    std::fs::remove_dir_all(&directory).ok();
}

#[test]
fn marks_of_undoes_code() {
    for marks in [[Mark::Correct, Mark::Absent, Mark::Present, Mark::Absent, Mark::Correct], [Mark::Absent; 5], [Mark::Correct; 5]] {
        assert_eq!(marks_of(code(&marks)), marks);
    }
    assert_eq!(marks_of(173), [Mark::Correct, Mark::Absent, Mark::Present, Mark::Absent, Mark::Correct]);
}

#[test]
fn a_distribution_matches_the_matrix_row_and_the_ranking() {
    let all = all_candidates();
    let top = &suggest(answers_matrix(), &all, SearchMode::Candidates, 1)[0];
    let chart = distribution(top.word, &all).unwrap();
    assert_eq!(chart.candidates, all.len());
    assert_eq!(chart.groups.iter().map(|group| group.count).sum::<usize>(), all.len());
    assert!((chart.bits - top.bits).abs() < 1e-9 && (chart.expected_left - top.expected_left).abs() < 1e-9);
    assert!(chart.groups.windows(2).all(|pair| pair[0].count >= pair[1].count));
    // Each group is a Feedback Code that really occurs in the matrix row.
    let row = answers_matrix().rows.binary_search(&top.word).unwrap();
    let cells = &answers_matrix().cells[row * all.len()..(row + 1) * all.len()];
    for group in &chart.groups {
        assert_eq!(cells.iter().filter(|&&cell| cell == group.code).count(), group.count);
    }
}

#[test]
fn a_distribution_needs_a_word_on_the_guess_list() {
    assert!(distribution("zzzzz", &all_candidates()).is_none());
    assert!(distribution("CRANE", &all_candidates()).is_some());
    assert!(distribution("cra", &all_candidates()).is_none());
}
