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
    let top = suggest(answers_matrix(), &all_candidates(), SearchMode::Candidates, Rank::Bits, 10);
    assert_eq!(top.len(), 10);
    assert!(top.windows(2).all(|pair| pair[0].bits >= pair[1].bits - 1e-9));
    // A first Guess on 2,315 Answers can tell us somewhere between 5 and 7 bits.
    assert!((5.0..7.0).contains(&top[0].bits), "{:?}", top[0]);
    // Candidates mode only suggests words that could be the Answer.
    assert!(top.iter().all(|suggestion| suggestion.is_candidate));
}

#[test]
fn searching_everything_never_does_worse_than_searching_candidates() {
    let candidates_only = suggest(answers_matrix(), &all_candidates(), SearchMode::Candidates, Rank::Bits, 1)[0].bits;
    let everything_answers = suggest(answers_matrix(), &all_candidates(), SearchMode::Everything, Rank::Bits, 1)[0].bits;
    let everything_valid = suggest(valid_matrix(), &all_candidates(), SearchMode::Everything, Rank::Bits, 1)[0].bits;
    assert!(everything_answers >= candidates_only - 1e-9);
    // More words to choose from can only help.
    assert!(everything_valid >= everything_answers - 1e-9);
}

#[test]
fn candidates_mode_on_the_valid_matrix_matches_the_answers_matrix() {
    // Same words tried, so the same ranking, whichever matrix they are read from.
    let from_answers = suggest(answers_matrix(), &all_candidates(), SearchMode::Candidates, Rank::Bits, 5);
    let from_valid = suggest(valid_matrix(), &all_candidates(), SearchMode::Candidates, Rank::Bits, 5);
    assert_eq!(from_answers, from_valid);
}

#[test]
fn a_single_candidate_is_the_suggestion() {
    let answers = &word_lists().answers;
    let only = answers.iter().position(|&word| word == "cable").unwrap();
    for mode in [SearchMode::Candidates, SearchMode::Everything] {
        let top = suggest(valid_matrix(), &[only], mode, Rank::Bits, 3);
        assert_eq!(top[0].word, "cable", "{mode:?}");
        assert!(top[0].is_candidate);
        assert_eq!(top[0].bits, 0.0);
    }
    assert!(suggest(valid_matrix(), &[], SearchMode::Everything, Rank::Bits, 3).is_empty());
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
    let top = &suggest(answers_matrix(), &all, SearchMode::Candidates, Rank::Bits, 1)[0];
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

#[test]
fn round9_rounds_like_numpy() {
    // Values printed by `np.round(x, 9)`; the ones ending in 5 sit at a tie after scaling, which rounds to even.
    assert_eq!(round9(5e-10), 0.0);
    assert_eq!(round9(1.5e-9), 2e-9);
    assert_eq!(round9(2.5e-9), 2e-9);
    assert_eq!(round9(3.5e-9), 4e-9);
    assert_eq!(round9(0.1234567895), 0.12345679);
    assert_eq!(round9(0.1234567885), 0.123456788);
    assert_eq!(round9(61.0008639314), 61.000863931);
}

#[test]
fn settings_name_the_strategy_they_amount_to() {
    let named = |set, mode, by| Strategy::named(set, mode, by).map(|strategy| strategy.id);
    for set in MatrixSet::ALL {
        assert_eq!(named(set, SearchMode::Candidates, Rank::Bits), Some("bits-candidates"));
        assert_eq!(named(set, SearchMode::Candidates, Rank::ExpectedCandidates), Some("expected-candidates"));
    }
    assert_eq!(named(MatrixSet::ValidGuesses, SearchMode::Everything, Rank::Bits), Some("bits-all"));
    assert_eq!(named(MatrixSet::ValidGuesses, SearchMode::Everything, Rank::ExpectedCandidates), Some("expected-all"));
    assert_eq!(named(MatrixSet::Answers, SearchMode::Everything, Rank::Bits), None);
    assert_eq!(named(MatrixSet::Answers, SearchMode::Everything, Rank::ExpectedCandidates), None);
}

/// What the Python Solver printed for one State and one Strategy: the top Suggestions as
/// `(word, bits, expected Candidates)`.
type Expected = (&'static str, f64, f64);

/// Check the top Suggestions of `strategy` for the State of `guesses` against the Answer `answer`.
fn matches_python(guesses: &[&str], answer: &str, id: &str, want: &[Expected]) {
    let strategy = STRATEGIES.iter().find(|strategy| strategy.id == id).unwrap();
    let matrix = match strategy.set {
        MatrixSet::Answers => answers_matrix(),
        MatrixSet::ValidGuesses => valid_matrix(),
    };
    let state: Vec<(&str, Vec<Mark>)> = guesses.iter().map(|&guess| (guess, feedback(guess, answer))).collect();
    let left = candidates(state.iter().map(|(word, marks)| (*word, marks.as_slice())));
    let top = suggest(matrix, &left, strategy.mode, strategy.by, want.len());
    let got: Vec<&str> = top.iter().map(|suggestion| suggestion.word).collect();
    let words: Vec<&str> = want.iter().map(|(word, ..)| *word).collect();
    assert_eq!(got, words, "{id} after {guesses:?} (Answer {answer})");
    for (suggestion, (word, bits, expected)) in top.iter().zip(want) {
        assert!((suggestion.bits - bits).abs() < 1e-8, "{id} {word}: {} bits, Python {bits}", suggestion.bits);
        assert!((suggestion.expected_left - expected).abs() < 1e-8, "{id} {word}: {} left, Python {expected}", suggestion.expected_left);
    }
}

// The expected values below were printed by the Python package's `Solver.rank` (with the two-or-fewer
// Candidates rule of `Solver.suggest`) on the matrices in `precompute-cache/feedback/`.

#[test]
fn the_empty_state_matches_the_python_solver() {
    matches_python(&[], "", "bits-candidates", &[("raise", 5.877909691, 61.000863931), ("slate", 5.855775377, 71.572786177), ("crate", 5.834874004, 72.899784017), ("irate", 5.83139698, 63.779265659)]);
    matches_python(&[], "", "expected-candidates", &[("raise", 5.877909691, 61.000863931), ("arise", 5.820939701, 63.725701944), ("irate", 5.83139698, 63.779265659), ("arose", 5.767796702, 66.021166307)]);
    matches_python(&[], "", "bits-all", &[("tarse", 5.946725225, 66.044492441), ("tiare", 5.931203413, 60.933477322), ("soare", 5.88596011, 62.301079914), ("roate", 5.882779324, 60.42462203)]);
    matches_python(&[], "", "expected-all", &[("roate", 5.882779324, 60.42462203), ("tiare", 5.931203413, 60.933477322), ("raise", 5.877909691, 61.000863931), ("raile", 5.86570971, 61.330885529)]);
}

#[test]
fn a_big_candidate_set_matches_the_python_solver() {
    // 263 Candidates left after CRANE against THUMB.
    let (guesses, answer) = (&["crane"][..], "thumb");
    matches_python(guesses, answer, "bits-candidates", &[("spilt", 5.640498031, 7.88973384), ("sloth", 5.63956581, 8.27756654), ("split", 5.605539224, 7.836501901), ("hoist", 5.603077646, 9.380228137)]);
    matches_python(guesses, answer, "expected-candidates", &[("lousy", 5.494354249, 7.403041825), ("moult", 5.550901739, 7.562737643), ("split", 5.605539224, 7.836501901), ("spilt", 5.640498031, 7.88973384)]);
    matches_python(guesses, answer, "bits-all", &[("slipt", 5.67770119, 8.155893536), ("smolt", 5.6708567, 6.733840304), ("toils", 5.646543723, 6.787072243), ("sluit", 5.644373972, 7.235741445)]);
    matches_python(guesses, answer, "expected-all", &[("smolt", 5.6708567, 6.733840304), ("toils", 5.646543723, 6.787072243), ("louts", 5.575160238, 7.091254753), ("sluit", 5.644373972, 7.235741445)]);
}

#[test]
fn a_tie_on_the_primary_measure_is_broken_by_the_other_measure() {
    // SLATE against ROOST leaves 24 Candidates. Ranked by Expected Candidates, TORSO and FIRST both
    // leave 2.333333333 and are both Candidates; TORSO has more bits, so it comes first.
    let (guesses, answer) = (&["slate"][..], "roost");
    matches_python(guesses, answer, "bits-candidates", &[("torus", 3.772055209, 2.416666667), ("frost", 3.751629167, 2.166666667), ("worst", 3.65726823, 2.583333333), ("torso", 3.653107168, 2.333333333)]);
    matches_python(guesses, answer, "expected-candidates", &[("frost", 3.751629167, 2.166666667), ("joist", 3.605388542, 2.25), ("torso", 3.653107168, 2.333333333), ("first", 3.636842188, 2.333333333)]);
    matches_python(guesses, answer, "bits-all", &[("trois", 4.001629167, 1.75), ("trout", 3.934560814, 2.0), ("droit", 3.886842188, 1.916666667), ("torsi", 3.886842188, 1.916666667)]);
    matches_python(guesses, answer, "expected-all", &[("trois", 4.001629167, 1.75), ("droit", 3.886842188, 1.916666667), ("torsi", 3.886842188, 1.916666667), ("horis", 3.823934896, 1.916666667)]);
}

#[test]
fn a_tie_on_both_measures_goes_to_a_candidate_then_alphabetical() {
    // ADIEU then PIOUS against FLUME leaves 16 Candidates. TULLE (a Candidate) and BUTLE tie on
    // both measures, so the Candidate comes first; BUGLE and TRUCE tie and go alphabetically.
    let (guesses, answer) = (&["adieu", "pious"][..], "flume");
    matches_python(guesses, answer, "bits-candidates", &[("tulle", 3.75, 1.25), ("bugle", 3.577819531, 1.5), ("truce", 3.577819531, 1.5), ("brute", 3.5, 1.5)]);
    matches_python(guesses, answer, "expected-candidates", &[("tulle", 3.75, 1.25), ("bugle", 3.577819531, 1.5), ("truce", 3.577819531, 1.5), ("brute", 3.5, 1.5)]);
    matches_python(guesses, answer, "bits-all", &[("tulle", 3.75, 1.25), ("butle", 3.75, 1.25), ("cully", 3.702819531, 1.375), ("mulct", 3.702819531, 1.375)]);
    matches_python(guesses, answer, "expected-all", &[("tulle", 3.75, 1.25), ("butle", 3.75, 1.25), ("cully", 3.702819531, 1.375), ("mulct", 3.702819531, 1.375)]);
}

#[test]
fn two_candidates_left_go_to_candidates_only() {
    // CRANE against ACORN leaves ACORN and RANCH. Searching all words would list others (AAHED ties
    // them at 1 bit), but with two Candidates only they are tried.
    let (guesses, answer) = (&["crane"][..], "acorn");
    for id in ["bits-candidates", "expected-candidates", "bits-all", "expected-all"] {
        matches_python(guesses, answer, id, &[("acorn", 1.0, 1.0), ("ranch", 1.0, 1.0)]);
    }
    let state = [("crane", feedback("crane", answer))];
    let left = candidates(state.iter().map(|(word, marks)| (*word, marks.as_slice())));
    assert_eq!(suggest(valid_matrix(), &left, SearchMode::Everything, Rank::Bits, 4).len(), 2);
}
