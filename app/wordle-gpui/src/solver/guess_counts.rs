//! Play every Answer at once, as a tree, to get each one's Guess Count: the same tree play as the
//! Python package's `wordle/solver/guess_counts.py`.
//!
//! A Game is a Strategy's Guesses against one Answer, starting from an Opener. Every Answer that has
//! got the same Feedback so far shares a Candidate Set, and so the same next Guess, so the Answers
//! are played together: one Guess per node of the tree instead of one per Game. The results are the
//! same as playing each Game alone.
//!
//! The next Guess depends only on the Candidate Set (for a given Strategy), not on the Opener or the
//! Guesses before it, so a `Player` keeps the Guesses it has picked and every Opener it plays shares
//! them. The search for a Guess is `strategy::suggest`'s ranking on one thread, computed without
//! sorting every word: the best word by the same keys, ties and rounding included.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};

use super::matrix::WIN;
use super::strategy::{CODES, Matrix, MatrixSet, Rank, SearchMode, Strategy, round9};

/// No Strategy needs more than 8 Guesses; this only stops a runaway.
pub const SAFETY_LIMIT: u8 = 12;
/// The Guess Count of an Answer still unsolved at the safety limit: a Loss anyway.
pub const UNSOLVED: u8 = SAFETY_LIMIT + 1;

/// Marks a Guess List row that is not an Answer.
const NOT_AN_ANSWER: u32 = u32::MAX;

/// Plays Openers under any Strategy over the Guess × Answer Feedback matrix, on one thread, keeping
/// the next Guess of every Candidate Set it meets (its next-Guess cache). One per thread.
pub struct Player<'a> {
    /// `guesses_vs_answers`: rows are the sorted Guess List, columns the Answer List.
    feedback: &'a Matrix,
    /// The Guess List row of each Answer.
    answer_rows: Vec<u32>,
    /// The Answer List column of each Guess List row, or `NOT_AN_ANSWER`.
    row_answers: Vec<u32>,
    /// `n · log2 n` for every group size n, as the Python Solver works it out.
    n_log_n: Vec<f64>,
    /// Scratch space: which Answers are in the Candidate Set being searched.
    is_candidate: Vec<bool>,
    /// Scratch space: the size of each Feedback group of the row being scored.
    sizes: [u16; CODES],
    /// Scratch space: the Feedback Codes of the groups that are not empty.
    codes: Vec<u8>,
    /// Scratch space: each of those codes with its `n · log2 n`, in code order.
    values: Vec<(usize, f64)>,
    /// The next Guess (a row) for each Candidate Set (columns, ascending), per Strategy id.
    cache: HashMap<&'static str, HashMap<Box<[u16]>, u32>>,
}

/// The best row found so far in a search, with the keys it is ranked by.
struct Best {
    row: u32,
    is_candidate: bool,
    /// Σ n²: Expected Candidates times N, exact.
    sum_squares: u64,
    /// Expected Information rounded to 9 decimals.
    bits: f64,
}

impl<'a> Player<'a> {
    /// `feedback` must be the Guess × Answer matrix (`MatrixSet::ValidGuesses`).
    pub fn new(feedback: &'a Matrix) -> Self {
        assert!(feedback.columns.len() < usize::from(u16::MAX), "Candidates are kept as u16 columns");
        let answer_rows: Vec<u32> =
            feedback.columns.iter().map(|answer| feedback.rows.binary_search(answer).expect("the Guess List contains every Answer") as u32).collect();
        let mut row_answers = vec![NOT_AN_ANSWER; feedback.rows.len()];
        for (column, &row) in answer_rows.iter().enumerate() {
            row_answers[row as usize] = column as u32;
        }
        let n_log_n = (0..=feedback.columns.len()).map(|n| if n == 0 { 0.0 } else { n as f64 * (n as f64).log2() }).collect();
        Self {
            feedback,
            answer_rows,
            row_answers,
            n_log_n,
            is_candidate: vec![false; feedback.columns.len()],
            sizes: [0; CODES],
            codes: Vec::with_capacity(CODES),
            values: Vec::with_capacity(CODES),
            cache: HashMap::new(),
        }
    }

    /// The Guess List row of `word`, if it is on the list.
    pub fn row_of(&self, word: &str) -> Option<usize> {
        self.feedback.rows.binary_search(&word).ok()
    }

    /// How many Candidate Sets the cache holds, for every Strategy.
    pub fn cached(&self) -> usize {
        self.cache.values().map(HashMap::len).sum()
    }

    /// The Guess Count of every Answer, in Answer List order: its Game played with `strategy` from the
    /// Opener in Guess List row `opener`, `UNSOLVED` if still unsolved after `SAFETY_LIMIT` Guesses.
    /// None if `stop` was set before it finished.
    pub fn guess_counts(&mut self, strategy: &Strategy, opener: usize, stop: Option<&AtomicBool>) -> Option<Vec<u8>> {
        let answers = self.feedback.columns.len();
        let mut counts = vec![0u8; answers];
        // Each node is (Candidate Set, Guess to play, its number). Every Answer in the set is still unsolved.
        let mut pending: Vec<(Vec<u16>, u32, u8)> = vec![((0..answers as u16).collect(), opener as u32, 1)];
        let mut split: Vec<(u8, u16)> = Vec::with_capacity(answers);
        while let Some((candidates, guess, number)) = pending.pop() {
            if stop.is_some_and(|stop| stop.load(Ordering::Relaxed)) {
                return None;
            }
            let cells = self.feedback.row(guess as usize);
            split.clear();
            split.extend(candidates.iter().map(|&column| (cells[column as usize], column)));
            split.sort_unstable(); // by Feedback Code, then column, so each group is in ascending order
            for group in split.chunk_by(|a, b| a.0 == b.0) {
                if group[0].0 == WIN {
                    counts[group[0].1 as usize] = number;
                } else if number >= SAFETY_LIMIT {
                    group.iter().for_each(|&(_, column)| counts[column as usize] = UNSOLVED);
                } else if group.len() == 1 {
                    // The one Candidate left is the next Guess, and Wins.
                    counts[group[0].1 as usize] = number + 1;
                } else {
                    let set: Vec<u16> = group.iter().map(|&(_, column)| column).collect();
                    let next = self.next_guess(strategy, &set);
                    pending.push((set, next, number + 1));
                }
            }
        }
        Some(counts)
    }

    /// The row `strategy` guesses for this Candidate Set (columns, ascending), searching only on a miss.
    pub fn next_guess(&mut self, strategy: &Strategy, candidates: &[u16]) -> u32 {
        // One Candidate: guess it. Two: both split them into a Win and a single Candidate, so the
        // tie goes to the first alphabetically.
        if candidates.len() <= 2 {
            return self.answer_rows[candidates[0] as usize];
        }
        if let Some(&row) = self.cache.get(strategy.id).and_then(|guesses| guesses.get(candidates)) {
            return row;
        }
        let row = self.search(strategy, candidates);
        self.cache.entry(strategy.id).or_default().insert(candidates.into(), row);
        row
    }

    /// The best row for these Candidates (three or more), ranked as `strategy::suggest` ranks:
    /// the measure rounded to 9 decimals, then a word that could be the Answer, then the other
    /// measure, then alphabetical (the row order).
    fn search(&mut self, strategy: &Strategy, candidates: &[u16]) -> u32 {
        let mut best: Option<Best> = None;
        match strategy.mode {
            SearchMode::Candidates => {
                for &column in candidates {
                    let row = self.answer_rows[column as usize];
                    self.consider(strategy.by, row, true, candidates, &mut best);
                }
            }
            SearchMode::Everything => {
                for &column in candidates {
                    self.is_candidate[column as usize] = true;
                }
                let rows: Vec<u32> = match strategy.set {
                    MatrixSet::ValidGuesses => (0..self.feedback.rows.len() as u32).collect(),
                    MatrixSet::Answers => self.answer_rows.clone(),
                };
                for row in rows {
                    let column = self.row_answers[row as usize];
                    let is_candidate = column != NOT_AN_ANSWER && self.is_candidate[column as usize];
                    self.consider(strategy.by, row, is_candidate, candidates, &mut best);
                }
                for &column in candidates {
                    self.is_candidate[column as usize] = false;
                }
            }
        }
        best.expect("there are Candidates").row
    }

    /// Score `row` against the Candidates and make it `best` if it ranks higher.
    fn consider(&mut self, by: Rank, row: u32, is_candidate: bool, candidates: &[u16], best: &mut Option<Best>) {
        let cells = self.feedback.row(row as usize);
        for &column in candidates {
            let code = cells[column as usize];
            let size = &mut self.sizes[code as usize];
            if *size == 0 {
                self.codes.push(code);
            }
            *size += 1;
        }
        let sum_squares: u64 = self.codes.iter().map(|&code| u64::from(self.sizes[code as usize]).pow(2)).sum();

        // Expected Candidates is Σ n² / N with the same N for every row, so comparing Σ n² (exact
        // integers, at least 1 apart) orders rows as the rounded Expected Candidates do. Bits are
        // worked out only when they count: always when ranking by them, or else to break a tie.
        let total = candidates.len();
        let (better, bits) = match (by, best.as_ref()) {
            (Rank::Bits, top) => {
                let bits = self.bits(total);
                let better = top.is_none_or(|top| bits.total_cmp(&top.bits).then(is_candidate.cmp(&top.is_candidate)).then(top.sum_squares.cmp(&sum_squares)).is_gt());
                (better, Some(bits))
            }
            (Rank::ExpectedCandidates, None) => (true, None),
            (Rank::ExpectedCandidates, Some(top)) => match top.sum_squares.cmp(&sum_squares).then(is_candidate.cmp(&top.is_candidate)) {
                std::cmp::Ordering::Equal => {
                    let bits = self.bits(total);
                    (bits > top.bits, Some(bits))
                }
                order => (order.is_gt(), None),
            },
        };
        if better {
            let bits = bits.unwrap_or_else(|| self.bits(total));
            *best = Some(Best { row, is_candidate, sum_squares, bits });
        }

        for &code in &self.codes {
            self.sizes[code as usize] = 0;
        }
        self.codes.clear();
    }

    /// The Expected Information of the split in `sizes`, rounded to 9 decimals, computed exactly as
    /// the Python Solver does (`numpy_sum` over the 243 codes in order; the empty ones add nothing).
    fn bits(&mut self, total: usize) -> f64 {
        // The codes in ascending order, through a bit set rather than a sort.
        let mut present = [0u64; CODES.div_ceil(64)];
        for &code in &self.codes {
            present[code as usize / 64] |= 1 << (code % 64);
        }
        self.values.clear();
        for (word, mut bits) in present.into_iter().enumerate() {
            while bits != 0 {
                let code = word * 64 + bits.trailing_zeros() as usize;
                self.values.push((code, self.n_log_n[self.sizes[code] as usize]));
                bits &= bits - 1;
            }
        }
        let total = total as f64;
        round9((total.log2() - sparse_numpy_sum(&self.values, 0, CODES) / total).max(0.0))
    }
}

/// `numpy_sum` of `CODES` values that are zero except at `values` (positions ascending, in `start ..
/// start + n`), adding only those: adding 0.0 changes no sum, so the result is the same to the bit.
pub(crate) fn sparse_numpy_sum(values: &[(usize, f64)], start: usize, n: usize) -> f64 {
    if values.is_empty() {
        0.0
    } else if n < 8 {
        values.iter().fold(0.0, |sum, (_, value)| sum + value)
    } else if n <= 128 {
        let whole = start + n - n % 8;
        let mut lanes = [0.0; 8];
        let mut sum = None;
        for &(position, value) in values {
            if position < whole {
                lanes[(position - start) % 8] += value;
            } else {
                let total = sum.get_or_insert(((lanes[0] + lanes[1]) + (lanes[2] + lanes[3])) + ((lanes[4] + lanes[5]) + (lanes[6] + lanes[7])));
                *total += value;
            }
        }
        sum.unwrap_or(((lanes[0] + lanes[1]) + (lanes[2] + lanes[3])) + ((lanes[4] + lanes[5]) + (lanes[6] + lanes[7])))
    } else {
        let half = n / 2 - (n / 2) % 8;
        let split = values.partition_point(|&(position, _)| position < start + half);
        sparse_numpy_sum(&values[..split], start, half) + sparse_numpy_sum(&values[split..], start + half, n - half)
    }
}

#[cfg(test)]
#[path = "guess_counts_tests.rs"]
pub(crate) mod tests;
