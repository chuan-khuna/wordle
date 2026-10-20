use std::sync::atomic::AtomicBool;

use super::*;
use crate::solver::guess_counts::tests::feedback;

/// An empty folder of its own for one test.
fn temp_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("wordle-gpui-guess-counts-{name}-{}", std::process::id()));
    std::fs::remove_dir_all(&dir).ok();
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn strategy(id: &str) -> &'static Strategy {
    STRATEGIES.iter().find(|strategy| strategy.id == id).unwrap()
}

/// Build `strategies` in `dir` for `openers` on `threads` threads.
fn build_some(dir: &Path, strategies: &[&str], openers: &[&str], threads: usize) -> Built {
    let stop = AtomicBool::new(false);
    let options = Options {
        threads,
        strategies: strategies.iter().map(|id| strategy(id)).collect(),
        openers: Some(openers.iter().map(|word| word.to_string()).collect()),
        progress: &|_| {},
        stop: &stop,
    };
    build(dir, feedback(), options).unwrap()
}

fn cells(dir: &Path, id: &str) -> Vec<u8> {
    let feedback = feedback();
    read_cells(&matrix_path(dir, strategy(id)), feedback.rows.len(), feedback.columns.len()).unwrap().unwrap()
}

fn row_of<'a>(cells: &'a [u8], word: &str) -> &'a [u8] {
    let feedback = feedback();
    let row = feedback.rows.binary_search(&word).unwrap();
    &cells[row * feedback.columns.len()..(row + 1) * feedback.columns.len()]
}

fn played(id: &str, word: &str) -> Vec<u8> {
    let mut player = Player::new(feedback());
    let row = player.row_of(word).unwrap();
    player.guess_counts(strategy(id), row, None).unwrap()
}

#[test]
fn build_fills_the_rows_asked_for_and_nothing_else() {
    let dir = temp_dir("asked");
    let built = build_some(&dir, &["bits-candidates", "expected-candidates"], &["salet", "zymic"], 2);
    assert_eq!(built.filled, 4);
    assert!(!built.stopped);
    assert_eq!(built.paths.last().unwrap(), &dir.join(SUMMARY_FILE));
    for id in ["bits-candidates", "expected-candidates"] {
        let cells = cells(&dir, id);
        assert_eq!(row_of(&cells, "salet"), played(id, "salet"));
        assert_eq!(row_of(&cells, "zymic"), played(id, "zymic"));
        let filled = cells.chunks(feedback().columns.len()).filter(|row| row.iter().any(|&cell| cell != 0)).count();
        assert_eq!(filled, 2, "{id}: rows not asked for stay zero");
    }
    // The file is the `.npy` numpy writes: the header, then 14,855 × 2,315 cells.
    let bytes = std::fs::read(matrix_path(&dir, strategy("bits-candidates"))).unwrap();
    assert_eq!(bytes[..128], npy_header(14855, 2315)[..]);
    assert_eq!(bytes.len(), 128 + 14855 * 2315);
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn one_thread_and_several_write_the_same_bytes() {
    let one = temp_dir("one-thread");
    let four = temp_dir("four-threads");
    let openers: Vec<&str> = feedback().rows.iter().copied().step_by(997).collect();
    build_some(&one, &["expected-candidates"], &openers, 1);
    build_some(&four, &["expected-candidates"], &openers, 4);
    for file in ["expected-candidates.npy", "expected-candidates.ranking.csv", SUMMARY_FILE] {
        assert!(std::fs::read(one.join(file)).unwrap() == std::fs::read(four.join(file)).unwrap(), "{file}");
    }
    std::fs::remove_dir_all(&one).ok();
    std::fs::remove_dir_all(&four).ok();
}

#[test]
fn finished_rows_are_kept() {
    let dir = temp_dir("kept");
    build_some(&dir, &["bits-candidates"], &["salet"], 1);
    // Overwrite salet's row by hand: a run must leave a finished row alone, whatever it holds.
    let feedback = feedback();
    let row = feedback.rows.binary_search(&"salet").unwrap();
    let path = matrix_path(&dir, strategy("bits-candidates"));
    let mut file = OpenOptions::new().write(true).open(&path).unwrap();
    file.seek(SeekFrom::Start((128 + row * feedback.columns.len()) as u64)).unwrap();
    file.write_all(&vec![7; feedback.columns.len()]).unwrap();
    drop(file);
    let built = build_some(&dir, &["bits-candidates"], &["salet", "crane"], 1);
    assert_eq!(built.filled, 1);
    let cells = cells(&dir, "bits-candidates");
    assert!(row_of(&cells, "salet").iter().all(|&cell| cell == 7));
    assert_eq!(row_of(&cells, "crane"), played("bits-candidates", "crane"));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn an_unfinished_row_is_played_again() {
    let dir = temp_dir("unfinished");
    build_some(&dir, &["bits-candidates"], &["salet"], 1);
    // A row with a zero cell (as a crash mid-write could leave) is not finished.
    let feedback = feedback();
    let row = feedback.rows.binary_search(&"salet").unwrap();
    let path = matrix_path(&dir, strategy("bits-candidates"));
    let mut file = OpenOptions::new().write(true).open(&path).unwrap();
    file.seek(SeekFrom::Start((128 + row * feedback.columns.len() + 5) as u64)).unwrap();
    file.write_all(&[0, 9, 9]).unwrap();
    drop(file);
    assert_eq!(build_some(&dir, &["bits-candidates"], &["salet"], 1).filled, 1);
    assert_eq!(row_of(&cells(&dir, "bits-candidates"), "salet"), played("bits-candidates", "salet"));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn the_stop_flag_keeps_the_finished_rows() {
    let dir = temp_dir("stop");
    let stop = AtomicBool::new(false);
    let openers: Vec<String> = feedback().rows.iter().step_by(500).map(|word| word.to_string()).collect();
    let progress = |progress: Progress| {
        if progress.done >= 3 {
            stop.store(true, Ordering::Relaxed);
        }
    };
    let options = Options { threads: 2, strategies: vec![strategy("bits-candidates"), strategy("expected-candidates")], openers: Some(openers.clone()), progress: &progress, stop: &stop };
    let built = build(&dir, feedback(), options).unwrap();
    assert!(built.stopped);
    assert!(built.filled >= 3 && built.filled < openers.len());
    let cells = cells(&dir, "bits-candidates");
    let mut finished_rows = 0;
    for word in &openers {
        let row = row_of(&cells, word);
        if row.iter().any(|&cell| cell != 0) {
            assert_eq!(row, played("bits-candidates", word), "{word}");
            finished_rows += 1;
        }
    }
    assert_eq!(finished_rows, built.filled);
    // The second Strategy was never started, and the summary counts the rows finished so far.
    assert!(!matrix_path(&dir, strategy("expected-candidates")).exists());
    let summary: Value = serde_json::from_str(&std::fs::read_to_string(dir.join(SUMMARY_FILE)).unwrap()).unwrap();
    assert_eq!(summary["bits-candidates"]["complete_rows"], json!(built.filled));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn a_folder_copied_from_the_python_command_is_resumed() {
    // A copy of `precompute-cache/guess-counts/` differs only in the manifest's `tool`, which is not checked.
    let dir = temp_dir("from-python");
    build_some(&dir, &["bits-candidates"], &["salet"], 1);
    let manifest = std::fs::read_to_string(dir.join(MANIFEST_FILE)).unwrap();
    std::fs::write(dir.join(MANIFEST_FILE), manifest.replace(TOOL, "wordle precompute-guess-counts (python)")).unwrap();
    assert_eq!(mismatch(&dir, strategy("bits-candidates"), feedback()), None);
    let built = build_some(&dir, &["bits-candidates"], &["salet", "crane"], 1);
    assert_eq!(built.filled, 1); // salet's row was finished in the copy, so only crane is played
    let cells = cells(&dir, "bits-candidates");
    assert_eq!(row_of(&cells, "salet"), played("bits-candidates", "salet"));
    assert_eq!(row_of(&cells, "crane"), played("bits-candidates", "crane"));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn a_matrix_the_manifest_does_not_vouch_for_is_not_resumed() {
    let dir = temp_dir("mismatch");
    build_some(&dir, &["bits-candidates"], &["salet"], 1);
    let manifest = std::fs::read_to_string(dir.join(MANIFEST_FILE)).unwrap();
    std::fs::write(dir.join(MANIFEST_FILE), manifest.replace("\"ranked_by\":\"bits\"", "\"ranked_by\":\"expected\"")).unwrap();
    let before = std::fs::read(matrix_path(&dir, strategy("bits-candidates"))).unwrap();
    let stop = AtomicBool::new(false);
    let options = Options { threads: 1, strategies: vec![strategy("bits-candidates")], openers: None, progress: &|_| {}, stop: &stop };
    match build(&dir, feedback(), options) {
        Err(BuildError::Mismatch { strategy, reason }) => {
            assert_eq!(strategy, "bits-candidates");
            assert_eq!(reason, "bits-candidates is not defined in manifest.json as it is now");
        }
        other => panic!("expected a mismatch, got {other:?}"),
    }
    assert!(std::fs::read(matrix_path(&dir, strategy("bits-candidates"))).unwrap() == before);
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn the_manifest_keeps_other_strategies_and_lists_the_words() {
    let dir = temp_dir("manifest");
    build_some(&dir, &["bits-candidates"], &["salet"], 1);
    build_some(&dir, &["expected-candidates"], &["salet"], 1);
    let text = std::fs::read_to_string(dir.join(MANIFEST_FILE)).unwrap();
    assert!(text.starts_with(r#"{"format_version":1,"tool":"wordle-gpui Precompute guess counts (rust)","safety_limit":12,"strategies":{"bits-candidates":{"name":"Expected Information, Candidates only","pool":"answers","scope":"candidates","ranked_by":"bits"},"expected-candidates":"#));
    assert!(text.ends_with("\"zonal\"]}\n"));
    let manifest: Value = serde_json::from_str(&text).unwrap();
    assert_eq!(manifest["rows"][0], "aahed");
    assert_eq!(manifest["columns"][0], "aback");
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn the_summary_ranks_by_average_then_bits_then_word() {
    let feedback = feedback();
    let columns = feedback.columns.len();
    let mut cells = vec![0u8; feedback.rows.len() * columns];
    let mut fill = |word: &str, counts: &[(usize, u8)], rest: u8| {
        let row = feedback.rows.binary_search(&word).unwrap();
        let cells = &mut cells[row * columns..(row + 1) * columns];
        cells.fill(rest);
        for &(column, count) in counts {
            cells[column] = count;
        }
    };
    fill("salet", &[(0, 7), (1, 13), (2, 2)], 4); // two Losses
    fill("crane", &[(0, 2), (1, 6)], 4); // the same total as roate, fewer bits
    fill("roate", &[(0, 6), (1, 2)], 4);
    fill("aahed", &[], 3); // the best
    fill("zymic", &[(9, 0)], 3); // a zero cell: unfinished, left out
    fill("aalii", &[], 5); // same total and (by hand) the same bits as aargh: alphabetical
    fill("aargh", &[], 5);
    let bits = |word: &str| match word {
        "crane" => 5.7,
        "roate" => 5.9,
        _ => 5.0,
    };
    let entries = summarize(&cells, feedback, &mut |row| bits(feedback.rows[row]));
    let words: Vec<&str> = entries.iter().map(|entry| entry.word).collect();
    assert_eq!(words, ["aahed", "roate", "crane", "salet", "aalii", "aargh"]);
    assert_eq!(entries.iter().map(|entry| entry.rank).collect::<Vec<_>>(), [1, 2, 3, 4, 5, 6]);
    let salet = &entries[3];
    assert_eq!(salet.average_guess_count, (7 + 13 + 2 + 4 * (columns - 3)) as f64 / columns as f64);
    assert_eq!(salet.losses, 2);
    assert_eq!(salet.distribution, [0, 1, 0, columns - 3, 0, 0]);
    assert!(salet.is_answer == feedback.columns.contains(&"salet"));
    assert!(entries[0].is_answer == feedback.columns.contains(&"aahed"));
    assert!(entries.iter().find(|entry| entry.word == "crane").unwrap().is_answer);
}

#[test]
fn the_summary_files_are_written_as_python_writes_them() {
    let entry = Entry { rank: 1, word: "salet", average_guess_count: 3.52829373650108, losses: 8, distribution: [0, 148, 1030, 946, 157, 26], bits: 5.834581525865648, is_answer: false };
    let whole = Entry { rank: 2, word: "crane", average_guess_count: 4.0, is_answer: true, ..entry.clone() };
    assert_eq!(
        ranking_csv(&[entry.clone(), whole]),
        "rank,opener,average_guess_count,losses,won_in_1,won_in_2,won_in_3,won_in_4,won_in_5,won_in_6,bits,is_answer\r\n\
         1,salet,3.52829373650108,8,0,148,1030,946,157,26,5.834581525865648,False\r\n\
         2,crane,4.0,8,0,148,1030,946,157,26,5.834581525865648,True\r\n"
    );
    assert_eq!(
        serde_json::to_string(&entry_json(&entry)).unwrap(),
        r#"{"rank":1,"word":"salet","average_guess_count":3.52829373650108,"losses":8,"distribution":[0,148,1030,946,157,26],"bits":5.834581525865648,"is_answer":false}"#
    );
}

/// The Python command's folder to compare with: `WORDLE_PYTHON_GUESS_COUNTS` if set, or else
/// `precompute-cache/guess-counts/`, if its manifest says Python wrote it.
fn python_reference() -> Option<PathBuf> {
    let dir = std::env::var_os("WORDLE_PYTHON_GUESS_COUNTS").map_or_else(python_dir, PathBuf::from);
    let manifest = read_manifest(&dir)?;
    manifest["tool"].as_str()?.ends_with("(python)").then_some(dir)
}

#[test]
fn rows_equal_the_python_commands_rows() {
    let Some(dir) = python_reference() else {
        eprintln!("skipped: no guess counts written by the Python command");
        return;
    };
    let feedback = feedback();
    let columns = feedback.columns.len();
    let mut player = Player::new(feedback);
    let mut compared = 0;
    for strategy in &STRATEGIES {
        if mismatch(&dir, strategy, feedback).is_some() {
            continue;
        }
        let Some(cells) = read_cells(&matrix_path(&dir, strategy), feedback.rows.len(), columns).unwrap() else { continue };
        let finished_rows: Vec<usize> = (0..feedback.rows.len()).filter(|&row| finished(&cells[row * columns..(row + 1) * columns])).collect();
        // A few rows spread over the finished ones (all of them if there are few).
        let step = (finished_rows.len() / 6).max(1);
        for &row in finished_rows.iter().step_by(step) {
            let counts = player.guess_counts(strategy, row, None).unwrap();
            assert!(counts[..] == cells[row * columns..(row + 1) * columns], "{} {}", strategy.id, feedback.rows[row]);
            compared += 1;
        }
    }
    eprintln!("compared {compared} rows with {}", dir.display());
}

#[test]
fn the_summary_equals_the_python_commands_summary() {
    // Only with a folder given on purpose: the shared one may be mid-run.
    let Some(dir) = std::env::var_os("WORDLE_PYTHON_GUESS_COUNTS").map(PathBuf::from).filter(|_| python_reference().is_some()) else {
        eprintln!("skipped: set WORDLE_PYTHON_GUESS_COUNTS to a folder the Python command wrote");
        return;
    };
    let copy = temp_dir("python-summary");
    for entry in std::fs::read_dir(&dir).unwrap() {
        let path = entry.unwrap().path();
        if path.extension().is_some_and(|extension| extension == "npy" || extension == "json") {
            std::fs::copy(&path, copy.join(path.file_name().unwrap())).unwrap();
        }
    }
    std::fs::remove_file(copy.join(SUMMARY_FILE)).unwrap();
    let paths = write_summary(&copy, feedback()).unwrap();
    for path in paths {
        let name = path.file_name().unwrap();
        assert!(std::fs::read(&path).unwrap() == std::fs::read(dir.join(name)).unwrap(), "{} differs", name.display());
    }
    std::fs::remove_dir_all(&copy).ok();
}

/// Times a real build, for the cost figures in `docs/documents/guess-count-matrix.md`:
/// `GUESS_COUNTS_OUT=<empty folder> GUESS_COUNTS_STRATEGY=bits-all GUESS_COUNTS_STEP=150
/// GUESS_COUNTS_THREADS=8 cargo test --release -- --ignored --nocapture measure_a_build`
/// plays every `STEP`th Opener (every one without `STEP`).
#[test]
#[ignore]
fn measure_a_build() {
    let var = |name: &str| std::env::var(name).ok();
    let dir = PathBuf::from(var("GUESS_COUNTS_OUT").expect("set GUESS_COUNTS_OUT"));
    let id = var("GUESS_COUNTS_STRATEGY").unwrap_or("bits-candidates".into());
    let threads = var("GUESS_COUNTS_THREADS").map_or(8, |threads| threads.parse().unwrap());
    let step = var("GUESS_COUNTS_STEP").map_or(1, |step| step.parse().unwrap());
    let openers = (step > 1).then(|| feedback().rows.iter().step_by(step).map(|word| word.to_string()).collect());
    let stop = AtomicBool::new(false);
    let started = Instant::now();
    let options = Options { threads, strategies: vec![strategy(&id)], openers, progress: &|_| {}, stop: &stop };
    let built = build(&dir, feedback(), options).unwrap();
    let seconds = started.elapsed().as_secs_f64();
    eprintln!("{id}: {} rows on {threads} threads in {seconds:.1}s, {:.3}s a row", built.filled, seconds / built.filled.max(1) as f64);
}
