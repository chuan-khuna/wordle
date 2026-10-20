# 03: Tree play in the package, with a next-Guess cache

**What to build:** The tree play (every Answer with the same Feedback so far shares a Candidate Set, and so the next Guess) moves from the backend's Benchmark into a new package module beside the matrix module. Given a Solver, a named Strategy and an Opener, it returns the Guess Count of every Answer, with the 12-Guess safety limit and the rule that with two or fewer Candidates left the search goes Candidates only. The next Guess is cached by Candidate Set, so the work is shared across Openers. The backend's Benchmark calls it, and its output does not change. A prefactor for the Guess Count Matrix.

**Blocked by:** 02 (the tree play takes the package's named Strategy, and both change the backend's Benchmark module)

**Status:** ready-for-agent

- [ ] The package exposes the tree play for one Strategy and one Opener, returning the Guess Count of every Answer in Answer List order
- [ ] A next-Guess cache keyed by Candidate Set, safe to share between threads, can be passed in and reused across Openers
- [ ] The backend's Benchmark uses the package's tree play; `benchmark.json` is unchanged when re-run
- [ ] The test that tree play matches playing each Game alone runs against the package function (in the package's tests) for all four Strategies
- [ ] The solver documentation describes the tree play and the cache

See [spec](../spec.md).

## Comments
