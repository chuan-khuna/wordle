# Solver Strategy

`packages/wordle/src/wordle/solver/strategy.py` picks Suggestions by Expected Information, reading Feedback Splits straight off the [Feedback matrices](feedback-matrices.md).

## Scoring a Guess

Restrict a Guess's matrix row to the Candidate columns and count each Feedback Code. With group sizes c₁ … cₖ out of N Candidates (p = c / N):

| Measure | Formula | Better |
| --- | --- | --- |
| Expected Information (`bits`) | Σ p · log2(1/p) = log2 N − Σ c log2 c / N | higher |
| Expected Candidates (`expected_candidates`) | Σ p · c = Σ c² / N | lower |

`WordStats` also gives the number of groups, the largest group, whether the word is a Candidate, and its chance to Win now (1 / N for a Candidate). The counting is one `np.bincount` over a block of rows at a time, so ranking all 14,855 Guesses is a few vectorised passes.

## Search options

`Solver.rank(candidates, pool=..., scope=..., by=..., top=...)`:

- `pool="answers"` searches the Answer × Answer matrix (only Answer List words); `pool="guesses"` searches the Guess × Answer matrix (any Guess List word).
- `scope="candidates"` only considers current Candidates; `scope="global"` considers every word in the pool.
- `by="bits"` ranks by most Expected Information; `by="expected"` by lowest Expected Candidates.

Ties go to a Candidate, then to the other measure, then to alphabetical order. `suggest` returns the top Guess and switches to `scope="candidates"` once two or fewer Candidates are left. `stats(word, candidates)` scores any one Guess List word, and `split(word, candidates)` lists the Candidates in each group. `candidates(state)` and `narrow(...)` filter the Candidate Set from Feedback.

## Compared with the reference project

`references/wordle-but-statistics/utils/reverse_wordle.py` ranked Guesses only by expected vocabulary size (Σ c² / N, the same as Expected Candidates here), from a CSV of text Feedback loaded into pandas and scanned one column per Guess with `value_counts`. Differences:

- Expected Information in bits is added as a second Strategy, and every result returns full stats instead of printing one number.
- The old code compared against a rounded value (`np.round(..., 1)`), so near-ties were decided by list order; here ties are broken explicitly, preferring Candidates.
- The old code had one matrix (common words × common words), so "all words" could only mean that list; here the Guess pool can be the Answer List or the full Guess List.
- Scoring uses `uint8` Feedback Codes and vectorised counting instead of per-column pandas work.

Tests: `packages/wordle/tests/test_strategy.py` checks the stats against a brute-force count with `wordle.engine.feedback.feedback`.
