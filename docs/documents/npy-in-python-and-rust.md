# `.npy` files in Python and Rust

How the Python package and the gpui app store the precomputed matrices, what one file looks like byte by byte, where the two tools differ, and what keeps them writing the same file. The matrices themselves are described in [Feedback matrices](feedback-matrices.md) and [Guess Count Matrix](guess-count-matrix.md); why `.npy` was chosen is [ADR 0001](../adr/0001-guess-count-matrix-file-format.md).

## Who writes what today

| File (under `precompute-cache/`) | Python package | gpui app (Rust) |
| --- | --- | --- |
| `feedback/answers_vs_answers.npy` | writes (`wordle.solver.matrix.build`, `np.save`) | writes (`solver/matrix.rs` `build`, `npy_bytes`) and reads |
| `feedback/guesses_vs_answers.npy` | writes (same) and reads | writes (same) and reads |
| `guess-counts/<strategy id>.npy` | writes in place (`open_memmap`) and reads | writes in place (`solver/guess_count_matrix.rs` `build`) and reads |
| `guess-counts/manifest.json`, `summary.json`, `<id>.ranking.csv` | writes | writes (with `serde_json`); the Solver panel will read `summary.json` |

For the Feedback matrices both tools write byte-identical files; this was checked by building both into empty folders and comparing them with `cmp`. For the Guess Count Matrix the gpui app follows the contract below: its rows equal the Python command's rows, and from the same matrices it writes `summary.json` and the ranking CSVs byte for byte as Python does (`rows_equal_the_python_commands_rows` and `the_summary_equals_the_python_commands_summary` in `solver/guess_count_matrix_tests.rs`). `manifest.json` differs only in `tool`.

## One file, byte by byte

Every matrix here is a 2D `uint8` array, saved as `.npy` format 1.0: a 128-byte header, then the cells row after row with no gaps.

```
offset 0                         10                                                   128                      end
       ┌──────────┬────┬────┬──────────────────────────────────────────────────────┬────────────────────────────┐
       │ \x93NUMPY│1 0 │118 │{'descr': '|u1', 'fortran_order': False,              │ row 0 │ row 1 │ … │ row R-1│
       │  magic   │ver │len │ 'shape': (14855, 2315), }   ⎵⎵⎵…51 spaces…⎵⎵⎵      \n│ 2,315 bytes each           │
       └──────────┴────┴────┴──────────────────────────────────────────────────────┴────────────────────────────┘
```

The header of `bits-candidates.npy` (`xxd`). The other three 14,855 × 2,315 files have exactly the same header:

```
00000000: 934e 554d 5059 0100 7600 7b27 6465 7363  .NUMPY..v.{'desc
00000010: 7227 3a20 277c 7531 272c 2027 666f 7274  r': '|u1', 'fort
00000020: 7261 6e5f 6f72 6465 7227 3a20 4661 6c73  ran_order': Fals
00000030: 652c 2027 7368 6170 6527 3a20 2831 3438  e, 'shape': (148
00000040: 3535 2c20 3233 3135 292c 207d 2020 2020  55, 2315), }
00000050: 2020 2020 2020 2020 2020 2020 2020 2020
00000060: 2020 2020 2020 2020 2020 2020 2020 2020
00000070: 2020 2020 2020 2020 2020 2020 2020 200a                 .
```

| Bytes | Meaning |
| --- | --- |
| 0 to 5 | magic `\x93NUMPY` |
| 6 to 7 | format version 1.0 |
| 8 to 9 | header length, little-endian `u16`: `0x0076` = 118 |
| 10 to 127 | a Python dict literal: `'descr': '|u1'` (unsigned byte), `'fortran_order': False` (row by row), `'shape': (rows, columns)`, padded with spaces to a multiple of 64 and ended by `\n` |
| 128 on | the cells: cell `[r, c]` is the byte at `128 + r × columns + c` |

The file size is always `128 + rows × columns` (34,389,453 bytes for 14,855 × 2,315; 5,359,353 for 2,315 × 2,315).

## Rows and columns

Neither file stores words, only indices. Both tools derive the same order from the same word lists:

- **Rows** are the Guess List sorted by byte order (Python `sorted(words.guesses)`, Rust `sort_unstable()` on `&str`, the same for lowercase ASCII). Row 0 is `aahed`, row 14,854 is `zymic`. `answers_vs_answers.npy` uses the sorted Answer List instead.
- **Columns** are the Answer List sorted: column 0 is `aback`, column 2,314 is `zonal`.
- The Guess List always includes every Answer: both tools add the Answers to `guesses.txt`, which already contains them, so there are 14,855 rows.

The word lists are two copies of the same files: `packages/wordle/src/wordle/data/` for Python and `app/wordle-gpui/data/` for Rust, which the app compiles in with `include_str!`. If they drifted apart, every row index would shift. `test_the_gpui_app_has_the_same_word_lists` fails if they differ. For the Guess Count Matrix, `manifest.json` also stores both lists in full (`rows`, `columns`), so any reader can map indices to words without the package.

## What the cells hold

The same rows and columns with words, from the finished matrices (first four Answers and the last):

**`guess-counts/bits-candidates.npy`:** Guess Count, 1 to 13 (13 = the 12-Guess safety limit was hit), 0 = row not filled yet

| row | Opener ↓ / Answer → | aback (0) | abase (1) | abate (2) | abbey (3) | … | zonal (2314) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | aahed | 4 | 3 | 2 | 3 | … | 4 |
| 1 | aalii | 3 | 4 | 4 | 3 | … | 6 |
| 2257 | cigar | 4 | 3 | 3 | 4 | … | 3 |
| 11095 | salet | 3 | 4 | 3 | 3 | … | 4 |
| 11829 | slate | 3 | 3 | 3 | 3 | … | 4 |
| 14854 | zymic | 4 | 3 | 4 | 4 | … | 3 |

The first 16 cell bytes on disk (offset 128 on, row `aahed`) are `4 3 2 3 3 2 2 2 3 3 4 4 3 4 4 2`. Across the `salet` row the counts are 148 × 2, 1,030 × 3, 946 × 4, 157 × 5, 26 × 6, 7 × 7 and 1 × 8 Guesses, which gives `distribution` `[0, 148, 1030, 946, 157, 26]` and 8 `losses` in `summary.json`. To read `salet` against `abase` by hand: `128 + 11095 × 2315 + 1` = byte 25,685,054.

Over the whole matrix the values are 1 (2,315 cells: the diagonal of Openers that are Answers) up to 10, mostly 3 and 4.

**`feedback/guesses_vs_answers.npy`:** packed Feedback, 0 to 242 (see [Feedback matrices](feedback-matrices.md))

| row | Guess ↓ / Answer → | aback | abase | abate | abbey | … | zonal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | aahed | 189 | 192 | 192 | 168 | … | 81 |
| 11095 | salet | 27 | 111 | 31 | 33 | … | 36 |
| 14854 | zymic | 1 | 0 | 0 | 27 | … | 162 |

In Python:

```python
import json, numpy as np
manifest = json.load(open("precompute-cache/guess-counts/manifest.json"))
m = np.load("precompute-cache/guess-counts/bits-candidates.npy", mmap_mode="r")
m[manifest["rows"].index("salet"), manifest["columns"].index("abase")]   # 4
```

## How each tool writes and reads

| | Python package | gpui app (Rust) |
| --- | --- | --- |
| Write a whole matrix | `np.save(path, array)` | `npy_bytes(rows, cols, &cells)` builds the header by hand, then `std::fs::write` |
| Write rows in place | `np.lib.format.open_memmap(path, mode="w+", …)` creates the file full of zeros, then `matrix[row] = …` and `flush()` | `npy_header` then `set_len` creates the file full of zeros; each row is written with `seek` + `write_all` at `128 + row × 2315` (zeros first), `sync_data` every 10 s |
| Read | `np.load(path, mmap_mode="r")`: memory-mapped, rows read from disk on demand | `std::fs::read` (whole file into memory), then `read_npy_header` gives the shape and the data offset |
| Header checks on read | numpy parses the full dict | `'|u1'` present, `'fortran_order': False` present, 2D shape, file size = offset + rows × columns; then the shape must match the word lists |
| Dependencies | numpy | none (no `npyz` crate) |

## Differences, and what keeps them from mattering

| Difference | Effect on the file | Guard |
| --- | --- | --- |
| Header: numpy writes it, Rust builds it by hand | none: the same 128 bytes. numpy reserves extra spaces so a shape can grow, Rust only pads to 64, but both end at 128 for every 2D `uint8` shape | `the_npy_header_is_byte_for_byte_the_one_numpy_writes` (Rust) and `test_npy_header_is_the_one_the_gpui_app_writes` (Python, both `np.save` and `open_memmap`) pin the same bytes |
| Two copies of the word lists | none while they are equal; if one changed, rows and columns would mean other words | `test_the_gpui_app_has_the_same_word_lists`; for the Guess Count Matrix also `manifest.json` |
| Sorting: Python `sorted`, Rust `sort_unstable` | none: both are byte order on lowercase ASCII, and the words are unique | the Feedback matrices are byte-identical across tools |
| Rust reads the whole file, Python memory-maps it | none on disk; Rust uses 34 MB of memory per Guess matrix | — |
| The Rust reader did not check `fortran_order` | none for today's files. A column-by-column file (for example `np.save(path, m.T)`) would have been read with rows and columns swapped | `read_npy_header` now refuses it (`a_column_by_column_npy_is_refused`) |
| Two writers of the Guess Count Matrix | none: the same rows, header, summary and CSV bytes | the contract below, and the tests named above |

## Contract for a second writer of the Guess Count Matrix

What the gpui app's writer (gpui ticket 02) matches so that either tool can resume the other's file:

- **`.npy`:** the header from `npy_bytes(14855, 2315, …)`, cells `u8`, rows and columns as above. Create the file full of zeros at full size, and write a finished row at offset `128 + row × 2315`, zeroing it first if it held values. A row is finished when none of its cells is 0.
- **Cell values:** the Guess Count of the Game played with no Guess Limit, 13 when the safety limit of 12 Guesses is hit. Never 0.
- **`manifest.json`:** compact JSON (`separators=(",", ":")`) plus a newline, with keys `format_version` (1), `tool`, `safety_limit` (12), `strategies` (`id → {name, pool, scope, ranked_by}`), `rows`, `columns`. Write it to a temporary file and rename it over the old one. Only `tool` differs between writers (`wordle precompute-guess-counts (python)` or `wordle-gpui Precompute guess counts (rust)`).
- **`summary.json` and `<id>.ranking.csv`:** written from the matrices. Two Python details a port would otherwise miss: the CSV's `is_answer` column is `True`/`False` (Python's `str(bool)`), and floats are Python's shortest round-trip `repr` (`3.52829373650108`). `serde_json` prints the same, and so does Rust's `{}` except for whole numbers (`3` where Python writes `3.0`); the gpui app uses `serde_json` for both files. A third: `bits` must be summed in numpy's pairwise order (blocks of up to 128 values in eight running sums), not left to right, or about half the values differ in the last digit; `strategy::numpy_sum` does this.

## Checking it yourself

```sh
xxd -l 128 precompute-cache/feedback/guesses_vs_answers.npy           # the header
od -A d -t u1 -j 128 -N 16 precompute-cache/guess-counts/bits-candidates.npy   # the first cells of row 0
just test && just test-gpui                                           # the guards above
```
