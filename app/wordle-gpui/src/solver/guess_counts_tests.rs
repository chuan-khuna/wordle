use std::sync::OnceLock;

use super::*;
use crate::engine::words::word_lists;
use crate::solver::matrix::score_matrix;
use crate::solver::strategy::{STRATEGIES, numpy_sum, suggest};

/// The Guess × Answer matrix, scored once for all the tests.
pub(crate) fn feedback() -> &'static Matrix {
    static MATRIX: OnceLock<Matrix> = OnceLock::new();
    MATRIX.get_or_init(|| {
        let mut guesses: Vec<&'static str> = word_lists().guesses.iter().copied().collect();
        guesses.sort_unstable();
        let answers = word_lists().answers.clone();
        let cells = score_matrix(&guesses, &answers, 4);
        Matrix::new(guesses, answers, cells)
    })
}

/// The Answer × Answer matrix: the Answer rows of `feedback`.
fn answers_matrix() -> &'static Matrix {
    static MATRIX: OnceLock<Matrix> = OnceLock::new();
    MATRIX.get_or_init(|| {
        let feedback = feedback();
        let answers = feedback.columns.clone();
        let cells = answers.iter().flat_map(|answer| feedback.row(feedback.rows.binary_search(answer).unwrap()).to_vec()).collect();
        Matrix::new(answers.clone(), answers, cells)
    })
}

/// A small random number generator, so the tests need no crate.
fn random(seed: &mut u64) -> u64 {
    *seed ^= *seed << 13;
    *seed ^= *seed >> 7;
    *seed ^= *seed << 17;
    *seed
}

/// One Game played alone with `strategy::suggest`: the Guess Count of `answer` from `opener`.
pub(crate) fn play_alone(strategy: &Strategy, opener: &'static str, answer: usize) -> u8 {
    let feedback = feedback();
    let matrix = match strategy.set {
        MatrixSet::Answers => answers_matrix(),
        MatrixSet::ValidGuesses => feedback,
    };
    let mut candidates: Vec<usize> = (0..feedback.columns.len()).collect();
    let mut guess = opener;
    for number in 1..=SAFETY_LIMIT {
        let cells = feedback.row(feedback.rows.binary_search(&guess).unwrap());
        if cells[answer] == WIN {
            return number;
        }
        candidates.retain(|&column| cells[column] == cells[answer]);
        guess = suggest(matrix, &candidates, strategy.mode, strategy.by, 1)[0].word;
    }
    UNSOLVED
}

#[test]
fn the_sparse_sum_is_numpys_sum_to_the_bit() {
    let mut seed = 0x2545_f491_4f6c_dd1d;
    for _ in 0..2000 {
        let mut dense = [0.0; CODES];
        let mut sparse = Vec::new();
        let filled = 1 + random(&mut seed) % 60;
        for position in 0..CODES {
            if random(&mut seed) % CODES as u64 <= filled {
                let size = (1 + random(&mut seed) % 400) as f64;
                dense[position] = size * size.log2();
                sparse.push((position, dense[position]));
            }
        }
        assert_eq!(sparse_numpy_sum(&sparse, 0, CODES).to_bits(), numpy_sum(&dense).to_bits());
    }
}

#[test]
fn numpy_sum_matches_values_printed_by_numpy() {
    // `np.log2(2315) - c_log_c.sum() / 2315` for these words against every Answer, from the Python
    // Solver (`Solver.stats(word, all_candidates()).bits`), printed with `repr`.
    let feedback = feedback();
    for (word, bits) in [("salet", 5.834581525865648), ("clast", 5.371538680801349), ("carte", 5.794557247295695)] {
        let row = feedback.row(feedback.rows.binary_search(&word).unwrap());
        assert_eq!(crate::solver::guess_count_matrix::opener_bits(row), bits, "{word}");
    }
}

#[test]
fn the_next_guess_is_the_top_suggestion() {
    let feedback = feedback();
    let mut player = Player::new(feedback);
    let mut seed = 0x9e37_79b9_7f4a_7c15;
    for strategy in &STRATEGIES {
        let matrix = match strategy.set {
            MatrixSet::Answers => answers_matrix(),
            MatrixSet::ValidGuesses => feedback,
        };
        // Candidate Sets as the tree meets them: what an Opener's Feedback leaves, then a random cut.
        for _ in 0..12 {
            let opener = feedback.rows[(random(&mut seed) % feedback.rows.len() as u64) as usize];
            let answer = (random(&mut seed) % feedback.columns.len() as u64) as usize;
            let cells = feedback.row(feedback.rows.binary_search(&opener).unwrap());
            let mut candidates: Vec<usize> = (0..feedback.columns.len()).filter(|&column| cells[column] == cells[answer]).collect();
            if random(&mut seed) % 2 == 0 {
                let keep = 3 + random(&mut seed) as usize % candidates.len().max(1);
                candidates.retain(|_| random(&mut seed) % 2 == 0);
                candidates.truncate(keep);
            }
            if candidates.is_empty() {
                continue;
            }
            let columns: Vec<u16> = candidates.iter().map(|&column| column as u16).collect();
            let want = suggest(matrix, &candidates, strategy.mode, strategy.by, 1)[0].word;
            let got = feedback.rows[player.next_guess(strategy, &columns) as usize];
            assert_eq!(got, want, "{} after {opener} with {} Candidates", strategy.id, candidates.len());
        }
    }
}

#[test]
fn rows_equal_playing_each_game_alone() {
    let feedback = feedback();
    let mut player = Player::new(feedback);
    for strategy in &STRATEGIES {
        // The global Strategies search all 14,855 words at every step, so they check fewer Games
        // (a test build is unoptimised); `rows_equal_the_python_commands_rows` covers whole rows.
        let (step, openers): (usize, &[&str]) = if strategy.mode == SearchMode::Everything { (67, &["salet"]) } else { (3, &["salet", "crane", "zymic"]) };
        for &opener in openers {
            let row = player.row_of(opener).unwrap();
            let counts = player.guess_counts(strategy, row, None).unwrap();
            for answer in (0..feedback.columns.len()).step_by(step) {
                assert_eq!(counts[answer], play_alone(strategy, opener, answer), "{} from {opener} to {}", strategy.id, feedback.columns[answer]);
            }
        }
    }
}

#[test]
fn an_opener_that_is_the_answer_takes_one_guess() {
    let feedback = feedback();
    let mut player = Player::new(feedback);
    let row = player.row_of("cigar").unwrap();
    let counts = player.guess_counts(&STRATEGIES[0], row, None).unwrap();
    assert_eq!(counts[feedback.columns.binary_search(&"cigar").unwrap()], 1);
    assert!(counts.iter().all(|&count| (1..=UNSOLVED).contains(&count)));
}

#[test]
fn a_set_stop_flag_stops_the_play() {
    let feedback = feedback();
    let mut player = Player::new(feedback);
    let stop = AtomicBool::new(true);
    assert_eq!(player.guess_counts(&STRATEGIES[0], 0, Some(&stop)), None);
}
