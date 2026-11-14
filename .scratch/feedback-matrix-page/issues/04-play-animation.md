# 04: Play the Game as an animation

**What to build:** A Play button on the Feedback Matrix page steps through the Solver's Guesses on a timer, fading the dimmed columns out between steps, and stops at the Win. It gives a clean, steady animation a video maker can record. See [the spec](../spec.md).

**Blocked by:** 03

**Status:** resolved

- [x] Play starts from the current step (from step 0 if already at the Win) and stops at the Win.
- [x] Columns fade between steps rather than switching at once; the fade does not refill the grid image.
- [x] Pause, Prev and Next work during Play; Prev/Next stop it.
- [x] `step` in the URL follows the animation without adding a history entry per step.
- [x] Play respects `prefers-reduced-motion` (no fade, steps only).
- [x] `web-frontend.md` describes Play.
