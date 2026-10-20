//! The Guess Count Matrix: how many Guesses every Opener takes to Win every Answer, the same files
//! as the Python package's `wordle/solver/guess_count_matrix.py` writes (see
//! `docs/documents/guess-count-matrix.md` and ADR 0001), in the same folder, so either tool resumes
//! the other's rows.
//!
//! In `precompute-cache/guess-counts/`:
//!
//! - `<strategy id>.npy`: 14,855 × 2,315 `u8`, rows are Openers (the sorted Guess List), columns are
//!   Answers; a cell is the Guess Count (13 when the safety limit was hit), and a row of zeros is not
//!   filled yet. Rows are written in place, whole, once their Opener is fully played.
//! - `manifest.json`: the word lists and each Strategy's definition; a matrix with rows is resumed
//!   only if it matches.
//! - `summary.json` and `<strategy id>.ranking.csv`: every complete Opener ranked by Average Guess
//!   Count, then Expected Information as a first Guess, then alphabetically.

use std::collections::HashMap;
use std::fmt;
use std::fs::{File, OpenOptions};
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use serde_json::{Map, Value, json};

use super::guess_counts::{Player, SAFETY_LIMIT};
use super::matrix::npy_header;
use super::strategy::{CODES, Matrix, MatrixSet, Rank, STRATEGIES, SearchMode, Strategy, numpy_sum};
use crate::engine::game::MAX_GUESSES as GUESS_LIMIT;

pub const SUBDIR: &str = "guess-counts";
pub const MANIFEST_FILE: &str = "manifest.json";
pub const SUMMARY_FILE: &str = "summary.json";
pub const FORMAT_VERSION: u64 = 1;
/// Who wrote the manifest: the one field that differs from the Python command's.
pub const TOOL: &str = "wordle-gpui Precompute guess counts (rust)";
/// How often finished rows are flushed to disk during a run.
const FLUSH_TIME: Duration = Duration::from_secs(10);
/// How many consecutive rows a thread takes at a time.
const CHUNK: usize = 8;

/// Where the matrices go: `precompute-cache/guess-counts/` at the repo root, shared with the Python command.
pub fn default_dir() -> PathBuf {
    let repo_root = Path::new(env!("CARGO_MANIFEST_DIR")).ancestors().nth(2).expect("the app is two folders below the repo root");
    repo_root.join("precompute-cache").join(SUBDIR)
}

pub fn matrix_path(dir: &Path, strategy: &Strategy) -> PathBuf {
    dir.join(format!("{}.npy", strategy.id))
}

pub fn ranking_path(dir: &Path, strategy: &Strategy) -> PathBuf {
    dir.join(format!("{}.ranking.csv", strategy.id))
}

/// A Strategy as `manifest.json` records it, in the Python package's words.
fn definition(strategy: &Strategy) -> Value {
    let pool = match strategy.set {
        MatrixSet::Answers => "answers",
        MatrixSet::ValidGuesses => "guesses",
    };
    let scope = match strategy.mode {
        SearchMode::Candidates => "candidates",
        SearchMode::Everything => "global",
    };
    let ranked_by = match strategy.by {
        Rank::Bits => "bits",
        Rank::ExpectedCandidates => "expected",
    };
    json!({"name": strategy.name, "pool": pool, "scope": scope, "ranked_by": ranked_by})
}

fn read_manifest(dir: &Path) -> Option<Value> {
    serde_json::from_str(&std::fs::read_to_string(dir.join(MANIFEST_FILE)).ok()?).ok()
}

fn same_lists(manifest: &Value, feedback: &Matrix) -> bool {
    manifest.get("format_version") == Some(&json!(FORMAT_VERSION))
        && manifest.get("safety_limit") == Some(&json!(SAFETY_LIMIT))
        && manifest.get("rows") == Some(&json!(feedback.rows))
        && manifest.get("columns") == Some(&json!(feedback.columns))
}

/// Why the matrix of `strategy` in `dir` can't be resumed or summarized, or None if the manifest
/// vouches for it. `feedback` gives the current word lists (its rows and columns).
pub fn mismatch(dir: &Path, strategy: &Strategy, feedback: &Matrix) -> Option<String> {
    let Some(manifest) = read_manifest(dir) else {
        return Some(format!("there is no {MANIFEST_FILE}"));
    };
    if !same_lists(&manifest, feedback) {
        return Some(format!("the word lists, format or safety limit in {MANIFEST_FILE} differ from the current ones"));
    }
    if manifest.get("strategies").and_then(|strategies| strategies.get(strategy.id)) != Some(&definition(strategy)) {
        return Some(format!("{} is not defined in {MANIFEST_FILE} as it is now", strategy.id));
    }
    None
}

/// Record the word lists and `strategies`, keeping other Strategies' entries only while the lists
/// are the same. Compact JSON, written to a temporary file and renamed over the old one.
fn write_manifest(dir: &Path, strategies: &[&Strategy], feedback: &Matrix) -> io::Result<()> {
    let mut kept = match read_manifest(dir) {
        Some(old) if same_lists(&old, feedback) => old.get("strategies").and_then(Value::as_object).cloned().unwrap_or_default(),
        _ => Map::new(),
    };
    for strategy in strategies {
        kept.insert(strategy.id.into(), definition(strategy));
    }
    let manifest = json!({
        "format_version": FORMAT_VERSION,
        "tool": TOOL,
        "safety_limit": SAFETY_LIMIT,
        "strategies": kept,
        "rows": feedback.rows,
        "columns": feedback.columns,
    });
    std::fs::create_dir_all(dir)?;
    let tmp = dir.join("manifest.tmp");
    std::fs::write(&tmp, serde_json::to_string(&manifest)? + "\n")?;
    std::fs::rename(&tmp, dir.join(MANIFEST_FILE))
}

/// The cells of the matrix at `path` if it is a `rows` × `columns` `u8` `.npy`, else None.
fn read_cells(path: &Path, rows: usize, columns: usize) -> io::Result<Option<Vec<u8>>> {
    let mut file = match File::open(path) {
        Ok(file) => file,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };
    let header = npy_header(rows, columns);
    if file.metadata()?.len() != (header.len() + rows * columns) as u64 {
        return Ok(None);
    }
    let mut bytes = Vec::with_capacity(header.len() + rows * columns);
    file.read_to_end(&mut bytes)?;
    Ok((bytes[..header.len()] == header[..]).then(|| bytes.split_off(header.len())))
}

/// Whether every cell of a row holds a Guess Count.
fn finished(row: &[u8]) -> bool {
    !row.contains(&0)
}

/// How many rows of the matrix of `strategy` in `dir` hold any Guess Count (0 if there is no file).
pub fn filled_rows(dir: &Path, strategy: &Strategy, feedback: &Matrix) -> io::Result<usize> {
    let columns = feedback.columns.len();
    Ok(read_cells(&matrix_path(dir, strategy), feedback.rows.len(), columns)?.map_or(0, |cells| cells.chunks(columns).filter(|row| row.iter().any(|&cell| cell != 0)).count()))
}

/// The matrix at `path` opened for writing rows in place, with its cells; created full of zeros if
/// it is missing or not the right shape.
fn open_matrix(path: &Path, rows: usize, columns: usize) -> io::Result<(File, Vec<u8>)> {
    if let Some(cells) = read_cells(path, rows, columns)? {
        return Ok((OpenOptions::new().write(true).open(path)?, cells));
    }
    let mut file = File::create(path)?;
    let header = npy_header(rows, columns);
    file.write_all(&header)?;
    file.set_len((header.len() + rows * columns) as u64)?;
    Ok((file, vec![0; rows * columns]))
}

/// One Opener's line in `summary.json` and the ranking CSV.
#[derive(Clone, Debug, PartialEq)]
pub struct Entry {
    pub rank: usize,
    pub word: &'static str,
    /// Over every Answer, Losses at their real count.
    pub average_guess_count: f64,
    /// Games that needed more than the Guess Limit.
    pub losses: usize,
    /// Games won in 1 to 6 Guesses.
    pub distribution: [usize; GUESS_LIMIT],
    /// Expected Information as a first Guess.
    pub bits: f64,
    pub is_answer: bool,
}

/// The Expected Information of the Guess in row `cells` against every Answer, to the bit what the
/// Python Solver's `stats(word, all_candidates()).bits` gives.
pub fn opener_bits(cells: &[u8]) -> f64 {
    let mut sizes = [0u32; CODES];
    for &code in cells {
        sizes[code as usize] += 1;
    }
    let n_log_n: Vec<f64> = sizes.iter().map(|&size| if size == 0 { 0.0 } else { f64::from(size) * f64::from(size).log2() }).collect();
    let total = cells.len() as f64;
    total.log2() - numpy_sum(&n_log_n) / total
}

/// The ranked entries for every finished row of `cells` (rows of `feedback.rows`, columns of
/// `feedback.columns`): by total Guess Count, then by Expected Information as a first Guess
/// (higher first), then alphabetically. `bits` gives a row's Expected Information.
pub fn summarize(cells: &[u8], feedback: &Matrix, bits: &mut impl FnMut(usize) -> f64) -> Vec<Entry> {
    let columns = feedback.columns.len();
    let mut finished_rows: Vec<(usize, u64, f64)> = cells
        .chunks(columns)
        .enumerate()
        .filter(|(_, row)| finished(row))
        .map(|(index, row)| (index, row.iter().map(|&cell| u64::from(cell)).sum(), bits(index)))
        .collect();
    finished_rows.sort_by(|a, b| a.1.cmp(&b.1).then(b.2.total_cmp(&a.2)).then(feedback.rows[a.0].cmp(feedback.rows[b.0])));
    finished_rows
        .into_iter()
        .enumerate()
        .map(|(position, (index, total, bits))| {
            let row = &cells[index * columns..(index + 1) * columns];
            let word = feedback.rows[index];
            Entry {
                rank: position + 1,
                word,
                average_guess_count: total as f64 / columns as f64,
                losses: row.iter().filter(|&&cell| usize::from(cell) > GUESS_LIMIT).count(),
                distribution: std::array::from_fn(|n| row.iter().filter(|&&cell| usize::from(cell) == n + 1).count()),
                bits,
                is_answer: feedback.columns.binary_search(&word).is_ok(),
            }
        })
        .collect()
}

/// A float as Python's `repr` prints it (shortest round trip, `3.0` for a whole number).
pub fn python_float(x: f64) -> String {
    serde_json::to_string(&x).expect("a finite float")
}

/// The ranking CSV of one Strategy, as Python's `csv` module writes it (CRLF line ends, `True`/`False`).
pub fn ranking_csv(entries: &[Entry]) -> String {
    let mut csv = String::from("rank,opener,average_guess_count,losses");
    for n in 1..=GUESS_LIMIT {
        csv.push_str(&format!(",won_in_{n}"));
    }
    csv.push_str(",bits,is_answer\r\n");
    for entry in entries {
        let distribution: Vec<String> = entry.distribution.iter().map(usize::to_string).collect();
        let is_answer = if entry.is_answer { "True" } else { "False" };
        csv.push_str(&format!(
            "{},{},{},{},{},{},{is_answer}\r\n",
            entry.rank,
            entry.word,
            python_float(entry.average_guess_count),
            entry.losses,
            distribution.join(","),
            python_float(entry.bits)
        ));
    }
    csv
}

fn entry_json(entry: &Entry) -> Value {
    json!({
        "rank": entry.rank,
        "word": entry.word,
        "average_guess_count": entry.average_guess_count,
        "losses": entry.losses,
        "distribution": entry.distribution,
        "bits": entry.bits,
        "is_answer": entry.is_answer,
    })
}

/// Rewrite `summary.json` and the ranking CSVs from the matrices saved in `dir`, rows from any
/// earlier run (by either tool) included. Covers every Strategy that has a file the manifest vouches
/// for. Returns the CSVs, then the summary last.
pub fn write_summary(dir: &Path, feedback: &Matrix) -> io::Result<Vec<PathBuf>> {
    let mut bits_of: HashMap<usize, f64> = HashMap::new();
    let mut summary = Map::new();
    let mut paths = Vec::new();
    for strategy in &STRATEGIES {
        if mismatch(dir, strategy, feedback).is_some() {
            continue;
        }
        let Some(cells) = read_cells(&matrix_path(dir, strategy), feedback.rows.len(), feedback.columns.len())? else {
            continue;
        };
        let openers = summarize(&cells, feedback, &mut |row| *bits_of.entry(row).or_insert_with(|| opener_bits(feedback.row(row))));
        std::fs::write(ranking_path(dir, strategy), ranking_csv(&openers))?;
        paths.push(ranking_path(dir, strategy));
        let openers_json: Vec<Value> = openers.iter().map(entry_json).collect();
        summary.insert(strategy.id.into(), json!({"id": strategy.id, "name": strategy.name, "complete_rows": openers.len(), "openers": openers_json}));
    }
    std::fs::create_dir_all(dir)?;
    let path = dir.join(SUMMARY_FILE);
    std::fs::write(&path, serde_json::to_string(&Value::Object(summary))? + "\n")?;
    paths.push(path);
    Ok(paths)
}

/// What a run reports as it goes, for a progress bar and a log. Sent from any thread; a row's event
/// comes after the row is written, outside the file's lock.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Event {
    /// Before any pass, once the manifest check has passed: for each chosen Strategy, the rows
    /// already finished and the rows this run will play.
    Planned { strategy: &'static Strategy, finished: usize, to_fill: usize },
    /// A Strategy's pass starts: the rows finished before it and the rows it will play.
    PassStarted { strategy: &'static Strategy, finished: usize, to_fill: usize },
    /// One Opener's row was written: `done` of the pass's `total` rows so far (threads report out
    /// of order), with the row's Average Guess Count (Losses at their real count) and Losses.
    RowDone { strategy: &'static Strategy, word: &'static str, done: usize, total: usize, average_guess_count: f64, losses: usize },
    /// The rows written so far were synced to disk (every 10 s): `done` rows of this pass.
    Flushed { strategy: &'static Strategy, done: usize },
    /// The pass ended: `filled` rows written, `stopped` if the stop flag cut it short.
    PassEnded { strategy: &'static Strategy, filled: usize, stopped: bool },
}

/// What `build` is asked to do.
pub struct Options<'a> {
    /// How many threads play Openers (at least 1).
    pub threads: usize,
    pub strategies: Vec<&'static Strategy>,
    /// Only these Openers' rows (if still unfinished); None for every row.
    pub openers: Option<Vec<String>>,
    /// Called with each `Event`, from any thread.
    pub events: &'a (dyn Fn(Event) + Sync),
    /// Set it to stop: rows already written are kept, the summary is still written.
    pub stop: &'a AtomicBool,
}

/// What `build` did.
#[derive(Debug)]
pub struct Built {
    /// The matrices it opened, then the ranking CSVs, then `summary.json`.
    pub paths: Vec<PathBuf>,
    /// Whether the stop flag ended it before every row asked for was filled.
    pub stopped: bool,
    /// How many rows it filled.
    pub filled: usize,
}

#[derive(Debug)]
pub enum BuildError {
    Io(io::Error),
    /// A matrix with rows that the manifest does not vouch for: resuming it would mix two kinds of rows.
    Mismatch { strategy: &'static str, reason: String },
    UnknownOpener(String),
}

impl fmt::Display for BuildError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BuildError::Io(error) => write!(f, "{error}"),
            BuildError::Mismatch { strategy, reason } => write!(f, "can't resume {strategy}: {reason}"),
            BuildError::UnknownOpener(word) => write!(f, "{word} is not on the Guess List"),
        }
    }
}

impl From<io::Error> for BuildError {
    fn from(error: io::Error) -> Self {
        BuildError::Io(error)
    }
}

impl From<serde_json::Error> for BuildError {
    fn from(error: serde_json::Error) -> Self {
        BuildError::Io(error.into())
    }
}

/// The file being filled, shared by the threads.
struct Output {
    file: File,
    flushed: Instant,
}

/// Fill the Guess Count Matrix of each chosen Strategy in `dir`, then rewrite `summary.json` and the
/// ranking CSVs. Only rows that are not finished are played (a resume, whichever tool left them),
/// on `options.threads` threads, each with its own next-Guess cache, in chunks of consecutive rows.
/// A row is written once its Opener is fully played, zeroed first. `feedback` is the Guess × Answer
/// Feedback matrix. A matrix with rows that the manifest does not vouch for stops the build before
/// anything is written.
pub fn build(dir: &Path, feedback: &Matrix, options: Options) -> Result<Built, BuildError> {
    let (rows, columns) = (feedback.rows.len(), feedback.columns.len());
    let asked: Option<Vec<usize>> = match &options.openers {
        None => None,
        Some(words) => Some(words.iter().map(|word| feedback.rows.binary_search(&word.as_str()).map_err(|_| BuildError::UnknownOpener(word.clone()))).collect::<Result<_, _>>()?),
    };
    let mut plan = Vec::new();
    for &strategy in &options.strategies {
        let cells = read_cells(&matrix_path(dir, strategy), rows, columns)?.unwrap_or_default();
        if cells.iter().any(|&cell| cell != 0)
            && let Some(reason) = mismatch(dir, strategy, feedback)
        {
            return Err(BuildError::Mismatch { strategy: strategy.id, reason });
        }
        let (finished_rows, todo) = rows_to_fill(&cells, rows, columns, asked.as_deref());
        plan.push(Event::Planned { strategy, finished: finished_rows, to_fill: todo.len() });
    }
    write_manifest(dir, &options.strategies, feedback)?;
    for event in plan {
        (options.events)(event);
    }

    let mut paths = Vec::new();
    let mut filled = 0;
    for &strategy in &options.strategies {
        if options.stop.load(Ordering::Relaxed) {
            break;
        }
        let path = matrix_path(dir, strategy);
        let (file, cells) = open_matrix(&path, rows, columns)?;
        paths.push(path);
        let (finished_rows, todo) = rows_to_fill(&cells, rows, columns, asked.as_deref());
        drop(cells);
        (options.events)(Event::PassStarted { strategy, finished: finished_rows, to_fill: todo.len() });
        let filled_now = fill(strategy, &todo, file, feedback, &options)?;
        filled += filled_now;
        (options.events)(Event::PassEnded { strategy, filled: filled_now, stopped: filled_now < todo.len() });
    }
    paths.extend(write_summary(dir, feedback)?);
    let stopped = options.stop.load(Ordering::Relaxed);
    Ok(Built { paths, stopped, filled })
}

/// How many rows of `cells` are finished, and the rows to play: the unfinished ones, of `asked` if
/// given. `cells` is empty for a matrix not written yet.
fn rows_to_fill(cells: &[u8], rows: usize, columns: usize, asked: Option<&[usize]>) -> (usize, Vec<usize>) {
    if cells.is_empty() {
        return (0, asked.map_or_else(|| (0..rows).collect(), <[usize]>::to_vec));
    }
    let unfinished = |&row: &usize| !finished(&cells[row * columns..(row + 1) * columns]);
    let todo = match asked {
        None => (0..rows).filter(unfinished).collect(),
        Some(asked) => asked.iter().copied().filter(unfinished).collect(),
    };
    (cells.chunks(columns).filter(|row| finished(row)).count(), todo)
}

/// Play the Openers in `todo` (rows) and write each row into `file`. Returns how many it wrote.
fn fill(strategy: &'static Strategy, todo: &[usize], file: File, feedback: &Matrix, options: &Options) -> io::Result<usize> {
    let columns = feedback.columns.len();
    let header = npy_header(feedback.rows.len(), columns).len() as u64;
    let total = todo.len();
    let output = Mutex::new(Output { file, flushed: Instant::now() });
    let next_chunk = AtomicUsize::new(0);
    let done = AtomicUsize::new(0);
    let chunks: Vec<&[usize]> = todo.chunks(CHUNK).collect();
    let threads = options.threads.clamp(1, chunks.len().max(1));

    let results: Vec<io::Result<()>> = thread::scope(|scope| {
        let handles: Vec<_> = (0..threads)
            .map(|_| {
                scope.spawn(|| -> io::Result<()> {
                    let mut player = Player::new(feedback);
                    let zeros = vec![0u8; columns];
                    while let Some(chunk) = chunks.get(next_chunk.fetch_add(1, Ordering::Relaxed)) {
                        for &row in *chunk {
                            let Some(counts) = player.guess_counts(strategy, row, Some(options.stop)) else {
                                return Ok(());
                            };
                            let flushed = {
                                let mut output = output.lock().expect("a writer thread panicked");
                                let offset = header + (row * columns) as u64;
                                // A stop mid-write leaves zeros, never a mix of old and new counts.
                                output.file.seek(SeekFrom::Start(offset))?;
                                output.file.write_all(&zeros)?;
                                output.file.seek(SeekFrom::Start(offset))?;
                                output.file.write_all(&counts)?;
                                let flush = output.flushed.elapsed() >= FLUSH_TIME;
                                if flush {
                                    output.file.sync_data()?;
                                    output.flushed = Instant::now();
                                }
                                flush
                            };
                            let done = done.fetch_add(1, Ordering::Relaxed) + 1;
                            let (sum, losses) = counts.iter().fold((0u64, 0), |(sum, losses), &cell| (sum + u64::from(cell), losses + usize::from(usize::from(cell) > GUESS_LIMIT)));
                            let average_guess_count = sum as f64 / columns as f64;
                            (options.events)(Event::RowDone { strategy, word: feedback.rows[row], done, total, average_guess_count, losses });
                            if flushed {
                                (options.events)(Event::Flushed { strategy, done });
                            }
                        }
                    }
                    Ok(())
                })
            })
            .collect();
        handles.into_iter().map(|handle| handle.join().expect("a guess count thread panicked")).collect()
    });
    output.into_inner().expect("a writer thread panicked").file.sync_data()?;
    results.into_iter().collect::<io::Result<()>>()?;
    Ok(done.into_inner())
}

#[cfg(test)]
#[path = "guess_count_matrix_tests.rs"]
mod tests;
