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

Ties go to a Candidate, then to the other measure, then to alphabetical order. `suggest` returns the top Guess and switches to `scope="candidates"` once two or fewer Candidates are left. `stats(word, candidates)` scores any one Guess List word, and `split(word, candidates)` lists the Candidates in each group. `candidates(state)` and `narrow(...)` filter the Candidate Set from Feedback, and `codes(guess, candidates)` gives the Feedback Code the Guess gets against each Candidate.

## Tree play

`wordle.solver.guess_counts.guess_counts(solver, how, opener, cache=None, settled=None)` plays a Strategy `how` (one of `STRATEGIES`) from an Opener against every Answer and returns the Guess Count of each, as a numpy array in Answer List order. Games are not played one by one: every Answer that has got the same Feedback so far shares a Candidate Set and so the same next Guess, so the Answers are played together as a tree, one search per node. The results are the same as playing each Game alone (`packages/wordle/tests/test_guess_counts.py` checks this for all four Strategies). The next Guess comes from `suggest`, so with two or fewer Candidates the search goes Candidates only. An Answer still unsolved after 12 Guesses (`SAFETY_LIMIT`, only a stop for a runaway) gets Guess Count 13 (`UNSOLVED`), a Loss anyway. `settled(n)`, if given, is called each time `n` more Answers get their Guess Count (the Guess Count Matrix's per-thread progress bars use it, and stop a worker by raising from it).

The next Guess depends only on the Candidate Set and the Strategy, so different Openers reach many of the same Candidate Sets. A `NextGuessCache` keyed by (Strategy, the bytes of the Candidate index array) can be passed in and reused across Openers and threads. It is a plain dict with no lock: a single get or set is atomic under the GIL, and two threads that miss on the same Candidate Set both search and store the same word, which only wastes work. In a 30-Opener prototype the cache cut a global Strategy from about 8.7 s to 5 s per Opener, and a Candidates-only Strategy to about 0.02 s.

## Compared with the reference project

`references/wordle-but-statistics/utils/reverse_wordle.py` ranked Guesses only by expected vocabulary size (Σ c² / N, the same as Expected Candidates here), from a CSV of text Feedback loaded into pandas and scanned one column per Guess with `value_counts`. Differences:

- Expected Information in bits is added as a second Strategy, and every result returns full stats instead of printing one number.
- The old code compared against a rounded value (`np.round(..., 1)`), so near-ties were decided by list order; here ties are broken explicitly, preferring Candidates.
- The old code had one matrix (common words × common words), so "all words" could only mean that list; here the Guess pool can be the Answer List or the full Guess List.
- Scoring uses `uint8` Feedback Codes and vectorised counting instead of per-column pandas work.

`STRATEGIES` in the same module names the four combinations of scope (Candidates only, or all words) and ranking (`bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`), each with an id, a display name, a pool, a scope and a ranking; the web backend's Benchmark plays every one.

Tests: `packages/wordle/tests/test_strategy.py` checks the stats against a brute-force count with `wordle.engine.feedback.feedback`.

## Where a Candidates-only search struggles

Searching only the Candidates (`scope="candidates"`, or **Search: Candidates** in the gpui Solver panel) loses on word families: Answers that share four letters, such as _ATCH, _OWER/_OVER, GRA_E, _ASTE or _ILLY. Every Candidate it can guess rules out only itself, so it works through the family one word at a time. Searching all words (`scope="global"`, **All words**) gets out of this trap by guessing a word that isn't a Candidate but tests several of the missing letters at once.

These numbers come from playing every Answer with the panel's Candidates search: the highest Expected Information each turn, ties to the alphabetically first word, Opener RAISE. With the Answers set and the Valid guesses set the results are the same, because both try only Candidates. The Guess Distribution over the 2,315 Answers:

| Guess Count | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Games | 1 | 131 | 999 | 919 | 207 | 47 | 9 | 2 |

The Average Guess Count is 3.60. 11 Answers need more than six Guesses, so they are Losses under the Guess Limit. The Seed plays that Answer (`just wordle --seed N`, or **Play a seed…** in the gpui app):

| Seed | Answer | Guesses | Path |
| --- | --- | --- | --- |
| 1906 | goner | 8 | raise › deter › cower › hover › joker › boxer › foyer › goner |
| 5924 | watch | 8 | raise › tangy › caput › batch › hatch › latch › match › watch |
| 2708 | foyer | 7 | raise › deter › cower › hover › joker › boxer › foyer |
| 877 | graze | 7 | raise › grace › grade › grape › grate › grave › graze |
| 2888 | match | 7 | raise › tangy › caput › batch › hatch › latch › match |
| 2701 | swore | 7 | raise › scree › shore › snore › spore › store › swore |
| 391 | tatty | 7 | raise › tangy › tabby › tacky › taffy › tally › tatty |
| 5452 | waste | 7 | raise › caste › baste › haste › paste › taste › waste |
| 1594 | water | 7 | raise › taper › cater › eater › hater › later › water |
| 2619 | wight | 7 | raise › pilot › fight › might › night › tight › wight |
| 1476 | willy | 7 | raise › pilot › filly › billy › dilly › hilly › willy |

Some that only just win in six, from the same families: stare (4898), store (2081), taste (3400), latch (6543), tight (2161), power (9558), grave (158), later (5429), boxer (6394).

Seed 5924 (watch) shows the trap well: after caput the Candidates are the _ATCH family. Switching to **All words** at that point lets the Solver pick a word outside the family that tests several of its first letters at once.
