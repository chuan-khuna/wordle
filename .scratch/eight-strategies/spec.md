# Eight Strategies: Guess Pool × Search Scope × Ranking

Status: done

Builds on [the Guess Count Matrix](../guess-count-matrix/spec.md), [its gpui build](../guess-count-matrix-gpui/spec.md) and [the shared precompute cache](../shared-precompute-cache/spec.md).

## Problem Statement

A Strategy is really three independent choices (see `GLOSSARY.md`): a **Guess Pool** (the Answer List or the Guess List), a **Search Scope** (Candidates only, or All words) and a **Ranking** (Expected Information or Expected Candidates). The code ties the first two together and names only four Strategies:

| id now | Guess Pool | Search Scope | Ranking |
| --- | --- | --- | --- |
| `bits-candidates` | answers | candidates | bits |
| `expected-candidates` | answers | candidates | expected |
| `bits-all` | guesses | global | bits |
| `expected-all` | guesses | global | expected |

This misleads in two ways:

- **The Guess Count Matrix ignores the Guess Pool for Openers.** Every matrix has all 14,855 Guess List words as rows, so `bits-candidates` ("answers") ranks `salet`, which is not on the Answer List, first. What that matrix holds is really "any Guess List Opener, then Candidates only".
- **Answer List with All words is missing.** Guessing any Answer List word, even one that is no longer a Candidate, is a real Strategy (the gpui panel can rank it but has no name for it), and it has no Guess Count Matrix or Benchmark.

## Solution

Eight Strategies, every combination of the three choices, and a Guess Count Matrix folder laid out by Ranking:

```
precompute-cache/guess-counts/
  manifest.json
  summary.json
  bits/
    answers-candidates.npy          2,315 × 2,315
    answers-candidates.ranking.csv
    answers-all.npy                 2,315 × 2,315
    guesses-candidates.npy         14,855 × 2,315
    guesses-all.npy                14,855 × 2,315
    ...
  expected/
    (the same four, and their ranking CSVs)
```

### Names

| id | Path (under `guess-counts/`) | Display name |
| --- | --- | --- |
| `bits-answers-candidates` | `bits/answers-candidates.npy` | Expected Information, Answer List, Candidates only |
| `bits-answers-all` | `bits/answers-all.npy` | Expected Information, Answer List, All words |
| `bits-guesses-candidates` | `bits/guesses-candidates.npy` | Expected Information, Guess List, Candidates only |
| `bits-guesses-all` | `bits/guesses-all.npy` | Expected Information, Guess List, All words |
| `expected-answers-candidates` | `expected/answers-candidates.npy` | Expected Candidates, Answer List, Candidates only |
| `expected-answers-all` | `expected/answers-all.npy` | Expected Candidates, Answer List, All words |
| `expected-guesses-candidates` | `expected/guesses-candidates.npy` | Expected Candidates, Guess List, Candidates only |
| `expected-guesses-all` | `expected/guesses-all.npy` | Expected Candidates, Guess List, All words |

- The id is `<ranking>-<pool>-<scope>`, using the code's existing values (`bits`/`expected`, `answers`/`guesses`, `candidates`; `global` is written `all`, as in the current ids and the gpui **All words** setting). It stays flat (no `/`) so it works as a URL parameter, a JSON key and a CLI argument; the path is derived from it.
- `STRATEGIES` is ordered Ranking, then Guess Pool, then Search Scope, as in the table.

### Rules

- **The Opener comes from the whole Guess Pool**, under either Search Scope; the Search Scope applies from the second Guess on. In the Guess Count Matrix this means a Strategy's rows are its Guess Pool (2,315 or 14,855 rows). Wherever the Solver picks an Opener itself (the Benchmark's `best_opener`, the gpui panel's first Suggestion), it ranks the whole Guess Pool. So `*-guesses-candidates` differs from `*-answers-candidates` only in the Opener, and in a Benchmark it can open with a word that isn't on the Answer List.
- **The current files are not played again.** Each current matrix is exactly one new one, and the Answer List rows of a Guesses one are the matching Answers one:
  - `bits-candidates` becomes `bits/guesses-candidates`, and its Answer List rows become `bits/answers-candidates`
  - `bits-all` becomes `bits/guesses-all`
  - the `expected-*` files move the same way
  - only `bits/answers-all` and `expected/answers-all` are new to play.
- **The manifest goes to `format_version: 2`.** `rows` becomes a map from Guess Pool to its sorted words (`{"answers": [...], "guesses": [...]}`), each Strategy entry gains its `path`, and `columns` stays the Answer List. A version 1 folder is a mismatch (the resume check says so and points at the migration); it is not read as version 2.
- `summary.json` keeps one entry per Strategy id, with Openers from that Strategy's rows only. `is_answer` stays (always true for an Answers Strategy).

## Decisions

- Ranking is the folder, not the Guess Pool, because the user compares Pools and Scopes under one Ranking.
- `*-guesses-candidates` is kept as its own Strategy rather than folded into `*-answers-candidates`: the Opener is a real difference (`salet` versus the best Answer List word).
- A new ADR is not needed: [ADR 0001](../../docs/adr/0001-guess-count-matrix-file-format.md) (`.npy` and a manifest) still holds; it gets a note on the version 2 layout.

## Out of scope

- Hard Mode Strategies.
- Rankings other than Expected Information and Expected Candidates.
- Keeping the old ids as aliases. The website's URL parameters and Article 11 move to the new ids in the same change.
