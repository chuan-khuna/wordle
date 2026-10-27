# Wordle-style word and State inputs in the Widgets

Status: done
Blocked by: 19

Replace the Widgets' text inputs with Wordle-style tile inputs.

**Word input** (a Guess or an Answer: the Feedback scorer's Guess and Answer, the Split explorer's Guess, the Step-through Game's Answer): a row of five empty tiles, like a row of the Wordle board. Focus the row and type: letters fill the tiles left to right, Backspace removes the last one, Enter confirms. The next tile to fill shows a caret or outline when focused. A word not on the Guess List (or the Answer List, for an Answer) is shown as invalid with the API's message, and the row gives a short shake that respects `prefers-reduced-motion`. It is one focusable control with an accessible label and a live value for screen readers (for example a visually hidden input that drives the tiles). It works on phones: tapping the row opens the on-screen keyboard.

**State input** (the Candidate filter, and the Split explorer's optional State), like the gpui app's Solver mode (see "Solver mode" in `docs/documents/gpui-app.md`):

- A small board of rows. Type a Guess into the next empty row and press Enter; it must be on the Guess List, and its tiles start Absent.
- Click (or tap, or Space/Enter on a focused tile) a tile to move it to its next Mark: Absent, Present, Correct, then Absent again. Every change works out the Candidates again.
- Backspace with nothing typed takes the last Guess back into the typing row to edit. Up to six Guesses; a row clicked to all Correct is a Win and stops input. A "Start over" button clears the State.
- Tiles use the theme's Mark colours and the design tokens; each tile's accessible name gives its letter and Mark ("S, Present").

Keep every Widget's props and URL params (the URL still holds the State as `guess:feedback,…`, updated on every change), the per-row "Candidates before → after" counts in the Candidate filter, and keyboard and touch use. Remove the old inputs and any helpers left unused. Update `docs/documents/web-frontend.md`.

See [spec](../spec.md).

## Comments

New `WordRow` (one hidden labelled `<input>` driving five tiles; shake on a refused word, not with reduced motion) and `StateBoard` (rows of clickable Mark tiles plus a typing row, Backspace pull-back, Win, six rows, "Start over"), with the pure logic and tests in `lib/state-board.ts`. Words are validated through the existing `GET /api/feedback?guess=w&answer=w` (400 for a word not on the Guess List) by `useGuessCheck`, 200ms after the fifth letter, and again on Enter in the board; the Step-through Game's Answer uses the message of its `/api/solve` call (Answer List). No backend change. `WordInput`, `cleanWord` in `ui.tsx` and the old "Add a Guess", "Remove" and "Clear" controls are gone. Tile names are now "S, Present". Docs: `web-frontend.md`. Not done: the 30 Mark tiles are all tab stops (no roving tabindex).
