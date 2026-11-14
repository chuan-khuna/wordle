# 03: The Solver plays, and columns go dark one Guess at a time

**What to build:** On the Feedback Matrix page the reader picks an Answer, a Strategy (the existing `StrategyPicker`) and an Opener (default: the Strategy's best, as on `/follow`). The Solver plays that Answer. A strip lists the Guesses with their Feedback, with Prev and Next. Step 0 is the whole grid lit; after Guess k, every column whose Answer is no longer a Candidate is dimmed (low opacity, colour still faintly visible). See [the spec](../spec.md).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] One `GET /api/solve` call (with `opener` when given) gives the Game; the Candidate Set after each Guess comes from `/api/candidates` with the State so far (one call per step, cached).
- [ ] Dimming is a separate layer, so changing step does not refill the grid image.
- [ ] The row of each Guess played is outlined when that Guess is on the Answer List; a Guess off the Answer List gets a short note in the strip instead.
- [ ] The Answer's column is marked above the grid.
- [ ] The Candidate Set size per step is shown ("2,315 → 147 → 12 → 1").
- [ ] An Answer off the Answer List or an Opener off the Guess Pool shows the API's message and keeps the last good Game.
- [ ] Every input is a URL param: `answer`, `pool`, `scope`, `by`, `opener`, `step`.
- [ ] The pure matrix-grid module gives the dimmed-column mask and the sizes per step from a recorded solve response, and which Guesses have a row; `bun test` covers them, including an Answer equal to the Opener.
- [ ] All text is in the page text table for both languages; `bun run screenshot` shows a mid-Game step.
- [ ] `web-frontend.md` describes the Game controls and dimming.
