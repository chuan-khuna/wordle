//! The Solver's Strategies: suggest the Guess with the highest Expected Information, or the lowest
//! Expected Candidates, read from a Feedback matrix (see `matrix.rs`). This mirrors
//! `Solver.rank` and `Solver.suggest` in the Python package, tie-breaks included.
//!
//! A Guess splits the Candidates into groups, one for each Feedback it could produce (its Feedback
//! Split). If a group holds `n` of the `N` Candidates, that Feedback turns up with probability
//! `p = n / N`, and learning it is worth `-log2(p)` bits. The Expected Information of the Guess is
//! those bits averaged over the split: `-Σ p·log2(p)`. A Guess that spreads the Candidates over many
//! small groups scores high; one that leaves them in a single group scores 0.
//!
//! The Expected Candidates of a Guess is the expected size of the next Candidate Set, `Σ n²/N`: lower
//! is better.
//!
//! Every Candidate is taken to be equally likely to be the Answer.
//!
//! Three choices make up a Strategy:
//! - the **matrix set** picks the Guesses that exist: `Answers` (only Answer List words) or
//!   `ValidGuesses` (every word on the Guess List);
//! - the **search mode** picks which of those are tried: `Candidates` (only words that could still be
//!   the Answer) or `Everything` (every word in the set, even ones already ruled out);
//! - the **measure** to rank by: `Rank::Bits` or `Rank::ExpectedCandidates`.

use std::collections::HashSet;
use std::io;
use std::path::Path;
use std::thread;

use crate::engine::feedback::Mark;
use super::matrix::{ANSWERS_FILE, GUESSES_FILE, pack};
use crate::engine::words::{WORD_LENGTH, word_lists};

/// How many different Feedback Codes there are (3⁵).
const CODES: usize = 243;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum MatrixSet {
    /// Rows are the Answer List: `answers_vs_answers.npy`.
    Answers,
    /// Rows are the whole Guess List: `guesses_vs_answers.npy`.
    ValidGuesses,
}

impl MatrixSet {
    pub const ALL: [MatrixSet; 2] = [MatrixSet::Answers, MatrixSet::ValidGuesses];

    pub fn file(self) -> &'static str {
        match self {
            MatrixSet::Answers => ANSWERS_FILE,
            MatrixSet::ValidGuesses => GUESSES_FILE,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SearchMode {
    /// Only words that could still be the Answer.
    Candidates,
    /// Every word in the matrix set.
    Everything,
}

/// The measure the Suggestions are ranked by.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Rank {
    /// Expected Information: most bits first.
    Bits,
    /// Expected Candidates: fewest Candidates left first.
    ExpectedCandidates,
}

/// A named way of choosing Guesses, as in `STRATEGIES` of the Python package.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Strategy {
    pub id: &'static str,
    pub name: &'static str,
    pub set: MatrixSet,
    pub mode: SearchMode,
    pub by: Rank,
}

pub const STRATEGIES: [Strategy; 4] = [
    Strategy { id: "bits-candidates", name: "Expected Information, Candidates only", set: MatrixSet::Answers, mode: SearchMode::Candidates, by: Rank::Bits },
    Strategy { id: "expected-candidates", name: "Expected Candidates, Candidates only", set: MatrixSet::Answers, mode: SearchMode::Candidates, by: Rank::ExpectedCandidates },
    Strategy { id: "bits-all", name: "Expected Information, all words", set: MatrixSet::ValidGuesses, mode: SearchMode::Everything, by: Rank::Bits },
    Strategy { id: "expected-all", name: "Expected Candidates, all words", set: MatrixSet::ValidGuesses, mode: SearchMode::Everything, by: Rank::ExpectedCandidates },
];

impl Strategy {
    /// The named Strategy that settings amount to, or None for a mix with no name (Answers with
    /// everything searched). Searching Candidates only picks the same Guesses from either set of words.
    pub fn named(set: MatrixSet, mode: SearchMode, by: Rank) -> Option<&'static Strategy> {
        STRATEGIES.iter().find(|strategy| strategy.by == by && strategy.mode == mode && (mode == SearchMode::Candidates || strategy.set == set))
    }
}

/// A Feedback matrix read into memory: rows are Guesses, columns are the Answer List.
pub struct Matrix {
    /// The Guess for each row, sorted.
    pub rows: Vec<&'static str>,
    /// The Answer for each column, sorted: the Answer List.
    pub columns: Vec<&'static str>,
    /// Row by row, one Feedback Code per cell.
    pub cells: Vec<u8>,
}

impl Matrix {
    /// Check that `cells` is `rows` × `columns`.
    pub fn new(rows: Vec<&'static str>, columns: Vec<&'static str>, cells: Vec<u8>) -> Self {
        assert_eq!(rows.len() * columns.len(), cells.len());
        Self { rows, columns, cells }
    }

    /// Read the matrix of `set` from `directory`, as `matrix::build` wrote it.
    pub fn load(directory: &Path, set: MatrixSet) -> io::Result<Matrix> {
        let lists = word_lists();
        let rows: Vec<&'static str> = match set {
            MatrixSet::Answers => lists.answers.clone(),
            MatrixSet::ValidGuesses => {
                let mut guesses: Vec<_> = lists.guesses.iter().copied().collect();
                guesses.sort_unstable();
                guesses
            }
        };
        let path = directory.join(set.file());
        let bytes = std::fs::read(&path).map_err(|error| {
            if error.kind() == io::ErrorKind::NotFound { io::Error::new(io::ErrorKind::NotFound, format!("{} not found", path.display())) } else { error }
        })?;
        let (shape, start) = read_npy_header(&bytes).map_err(|reason| io::Error::new(io::ErrorKind::InvalidData, format!("{}: {reason}", path.display())))?;
        if shape != (rows.len(), lists.answers.len()) {
            let message = format!("{} is {}×{}, but the word lists need {}×{}. Precompute the matrices again.", set.file(), shape.0, shape.1, rows.len(), lists.answers.len());
            return Err(io::Error::new(io::ErrorKind::InvalidData, message));
        }
        Ok(Matrix::new(rows, lists.answers.clone(), bytes[start..].to_vec()))
    }

    fn row(&self, index: usize) -> &[u8] {
        let width = self.columns.len();
        &self.cells[index * width..(index + 1) * width]
    }
}

/// The shape and the offset of the data of a `.npy` file holding a 2D `u8` array.
fn read_npy_header(bytes: &[u8]) -> Result<((usize, usize), usize), String> {
    if bytes.len() < 10 || &bytes[..6] != b"\x93NUMPY" {
        return Err("not an .npy file".into());
    }
    let header_len = u16::from_le_bytes([bytes[8], bytes[9]]) as usize;
    let start = 10 + header_len;
    let header = bytes.get(10..start).and_then(|header| std::str::from_utf8(header).ok()).ok_or("a broken .npy header")?;
    if !header.contains("'|u1'") {
        return Err("the cells are not u8".into());
    }
    let shape = header.split("'shape': (").nth(1).and_then(|rest| rest.split(')').next()).ok_or("no shape in the .npy header")?;
    let mut sizes = shape.split(',').filter_map(|size| size.trim().parse::<usize>().ok());
    match (sizes.next(), sizes.next()) {
        (Some(rows), Some(columns)) if bytes.len() == start + rows * columns => Ok(((rows, columns), start)),
        (Some(_), Some(_)) => Err("the file is the wrong size for its shape".into()),
        _ => Err("the shape is not 2D".into()),
    }
}

/// The Feedback Code of `feedback`, as in a matrix cell.
pub fn code(feedback: &[Mark]) -> u8 {
    feedback.iter().fold(0, |code, mark| code * 3 + *mark as u8)
}

/// The columns (Answer List indices) that would have produced every Feedback in the State so far.
/// `state` is each Guess with the Feedback it got.
pub fn candidates<'a>(state: impl IntoIterator<Item = (&'a str, &'a [Mark])> + Clone) -> Vec<usize> {
    let answers = &word_lists().answers;
    let to_letters = |word: &str| -> [u8; WORD_LENGTH] { word.as_bytes().try_into().expect("a word has five letters") };
    let seen: Vec<([u8; WORD_LENGTH], u8)> = state.into_iter().map(|(guess, feedback)| (to_letters(guess), code(feedback))).collect();
    (0..answers.len())
        .filter(|&index| {
            let answer = to_letters(answers[index]);
            seen.iter().all(|(guess, seen_code)| pack(guess, &answer) == *seen_code)
        })
        .collect()
}

/// A Guess worth making, and what it is expected to tell us.
#[derive(Clone, Debug, PartialEq)]
pub struct Suggestion {
    pub word: &'static str,
    /// Expected Information, in bits.
    pub bits: f64,
    /// How many Candidates are expected to be left after this Guess.
    pub expected_left: f64,
    /// Whether this word could be the Answer, so guessing it might win right now.
    pub is_candidate: bool,
}

/// The Expected Information, in bits, and the expected number of Candidates left, for the Guess
/// whose cells against the Candidates are `codes`.
fn split_stats(codes: impl Iterator<Item = u8>, total: usize) -> (f64, f64) {
    let mut sizes = [0u32; CODES];
    for code in codes {
        sizes[code as usize] += 1;
    }
    let total = total as f64;
    // As the Python Solver: Σ p·log2(1/p) = log2 N − Σ n·log2 n / N, and Σ n² / N.
    let mut n_log_n = 0.0;
    let mut sum_squares = 0.0;
    for &size in sizes.iter().filter(|&&size| size > 0) {
        let size = f64::from(size);
        n_log_n += size * size.log2();
        sum_squares += size * size;
    }
    // A one-group split can come out a rounding error below 0; show it as 0.
    ((total.log2() - n_log_n / total).max(0.0), sum_squares / total)
}

/// One group of a Feedback Split: the Candidates that would give the same Feedback.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Group {
    pub code: u8,
    /// How many Candidates are in this group.
    pub count: usize,
}

impl Group {
    /// The five Marks this group's Feedback Code stands for.
    pub fn marks(&self) -> [Mark; WORD_LENGTH] {
        marks_of(self.code)
    }
}

/// The five Marks of a Feedback Code: the opposite of `code`.
pub fn marks_of(mut code: u8) -> [Mark; WORD_LENGTH] {
    let mut marks = [Mark::Absent; WORD_LENGTH];
    for mark in marks.iter_mut().rev() {
        *mark = match code % 3 {
            0 => Mark::Absent,
            1 => Mark::Present,
            _ => Mark::Correct,
        };
        code /= 3;
    }
    marks
}

/// How a Guess would split the Candidates: its Feedback Split, and what it is worth.
#[derive(Clone, Debug, PartialEq)]
pub struct Distribution {
    pub word: String,
    pub candidates: usize,
    /// The groups, biggest first (ties: the lower Feedback Code first).
    pub groups: Vec<Group>,
    /// Expected Information, in bits.
    pub bits: f64,
    /// How many Candidates are expected to be left after this Guess.
    pub expected_left: f64,
}

/// The Feedback Split of `word` over the Candidates (columns of the Answer List), or None if `word`
/// isn't on the Guess List. Scores each pair directly, so no matrix is needed.
pub fn distribution(word: &str, candidates: &[usize]) -> Option<Distribution> {
    let lists = word_lists();
    let word = lists.guesses.get(word.to_ascii_lowercase().as_str()).copied()?;
    let guess: [u8; WORD_LENGTH] = word.as_bytes().try_into().ok()?;
    let mut sizes = [0usize; CODES];
    for &index in candidates {
        let answer: [u8; WORD_LENGTH] = lists.answers[index].as_bytes().try_into().ok()?;
        sizes[pack(&guess, &answer) as usize] += 1;
    }
    let mut groups: Vec<Group> = sizes.iter().enumerate().filter(|(_, count)| **count > 0).map(|(code, count)| Group { code: code as u8, count: *count }).collect();
    groups.sort_by(|a, b| b.count.cmp(&a.count).then(a.code.cmp(&b.code)));
    let (bits, expected_left) = if candidates.is_empty() { (0.0, 0.0) } else { split_stats(groups.iter().flat_map(|group| std::iter::repeat_n(group.code, group.count)), candidates.len()) };
    Some(Distribution { word: word.to_string(), candidates: candidates.len(), groups, bits, expected_left })
}

/// `x` rounded to 9 decimals the way numpy's `np.round(x, 9)` does: scaled, rounded to the nearest
/// even, scaled back. Measures within that of each other are a tie.
fn round9(x: f64) -> f64 {
    (x * 1e9).round_ties_even() / 1e9
}

/// The best `limit` Guesses for these Candidates (columns of `matrix`), best first by `by`. Ties
/// (the measure rounded to 9 decimals) go to a word that could be the Answer, then to the other
/// measure, then to alphabetical order. With two Candidates or fewer only Candidates are tried,
/// whatever `mode` says: guessing one of them is never worse.
/// With no Guesses made, the Candidates are the whole Answer List and this is the best Opener.
pub fn suggest(matrix: &Matrix, candidates: &[usize], mode: SearchMode, by: Rank, limit: usize) -> Vec<Suggestion> {
    if candidates.is_empty() {
        return Vec::new();
    }
    let mode = if candidates.len() <= 2 { SearchMode::Candidates } else { mode };
    let candidate_words: HashSet<&str> = candidates.iter().map(|&index| matrix.columns[index]).collect();

    // The rows to try.
    let rows: Vec<usize> = match mode {
        SearchMode::Everything => (0..matrix.rows.len()).collect(),
        SearchMode::Candidates => candidates.iter().filter_map(|&index| matrix.rows.binary_search(&matrix.columns[index]).ok()).collect(),
    };

    let score = |row: usize| {
        let cells = matrix.row(row);
        let (bits, expected_left) = split_stats(candidates.iter().map(|&column| cells[column]), candidates.len());
        let word = matrix.rows[row];
        Suggestion { word, bits, expected_left, is_candidate: candidate_words.contains(word) }
    };

    // Split the rows between the machine's cores; each thread scores its own share.
    let threads = thread::available_parallelism().map_or(1, |n| n.get()).min(8);
    let share = rows.len().div_ceil(threads).max(1);
    let mut scored: Vec<Suggestion> = thread::scope(|scope| {
        let handles: Vec<_> = rows.chunks(share).map(|chunk| scope.spawn(|| chunk.iter().map(|&row| score(row)).collect::<Vec<_>>())).collect();
        handles.into_iter().flat_map(|handle| handle.join().expect("a scoring thread panicked")).collect()
    });

    // Best first: more bits is better, fewer Candidates left is better.
    let by_bits = |a: &Suggestion, b: &Suggestion| round9(b.bits).total_cmp(&round9(a.bits));
    let by_left = |a: &Suggestion, b: &Suggestion| round9(a.expected_left).total_cmp(&round9(b.expected_left));
    scored.sort_by(|a, b| {
        let (primary, secondary): (&dyn Fn(&Suggestion, &Suggestion) -> _, &dyn Fn(&Suggestion, &Suggestion) -> _) = match by {
            Rank::Bits => (&by_bits, &by_left),
            Rank::ExpectedCandidates => (&by_left, &by_bits),
        };
        primary(a, b).then(b.is_candidate.cmp(&a.is_candidate)).then_with(|| secondary(a, b)).then(a.word.cmp(b.word))
    });
    scored.truncate(limit);
    scored
}

#[cfg(test)]
#[path = "strategy_tests.rs"]
mod tests;
