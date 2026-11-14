# Feedback Matrix page: watch the Candidate Set go dark

Status: ready-for-agent

Builds on [the website](../website/spec.md), [the Solve Tree pages](../solve-tree-pages/spec.md) (the Explore section, `/follow`) and [the Thai Translation](../thai-translation/spec.md) (every page takes a language).

## Problem Statement

A reader of the Series learns that the Solver looks every Feedback up in a **Feedback Matrix** (see `GLOSSARY.md`) instead of working it out, but never sees one. The Answer × Answer matrix is 2,315 × 2,315 Feedback Codes; as a picture it shows at once which pairs of words share letters, and the Win diagonal. And when the Solver plays a Game, the reader sees the Candidate Set shrink only as a number or as word groups (`/follow`), never as most of the Answer List being switched off at once, Guess by Guess.

## Solution

A new page under **Explore** in the sidebar, after Follow an Answer, in English and Thai: **Feedback Matrix** (`/matrix`, `/th/matrix`).

- **The grid**: the Answer × Answer Feedback Matrix drawn on a `<canvas>`, one cell per (Guess, Answer) pair.
  - x: every Answer List word (the Answer). y: every Answer List word (the Guess). Both axes in Answer List order (alphabetical), so the Win cells (Feedback Code 242) form the diagonal.
  - Each cell's colour is its Feedback Code, 0 to 242, on one sequential scale built from the theme's colours, so it reads in every theme, light and dark. A legend shows the scale with a few labelled Feedbacks as Tiles (`00000`, a middle code, `22222`).
  - A Candidate view (a "Colour by" switch: Feedback or Candidates) drops the Feedback colours: each column still a Candidate is blue and the rest grey (at step 0 the whole grid is blue), both from the theme; the legend follows the view.
  - a–z ticks on both axes: a tick where each first letter's words begin, its letter centred on that letter's span; crowded labels are dropped, the ticks stay. They follow the zoom and pan.
  - The grid is a square that fits both the content width and the viewport height below the sticky Guess strip, so the whole grid is in view at once and nothing scrolls: no scrollbar in the frame, and the page never scrolls sideways. The wheel (desktop) or a pinch (phone) zooms around the pointer, a drag pans when zoomed in, and the view never shows past the grid's edges; fit is the smallest zoom. Reset and a double-click go back to fit; with the focus on the grid, `+` / `-` zoom and the arrow keys pan. Single cells can be picked out on a phone too.
  - Hovering (or tapping) a cell shows the Guess, the Answer and the Feedback as Tiles.
- **Going dark, one Guess at a time**: the reader picks an Answer and a Strategy, and the Solver plays that Answer.
  - Inputs: the Answer (an Answer List word), the Strategy (the existing `StrategyPicker`) and the Opener (default: the Strategy's best, as on `/follow`).
  - Step 0 is the whole grid lit. After Guess k, every column whose Answer is no longer a Candidate is dimmed (drawn at low opacity, its colour still faintly visible). The columns still lit are the Candidate Set.
  - The row of each Guess played is outlined, when that Guess is on the Answer List. A Guess off the Answer List (Guess List pools) has no row; the strip says so with a short note instead.
  - The Answer's column is marked (a thin marker above the grid), so it can be followed until it is the only lit column.
  - A strip of Guesses with their Feedback, like `/follow`'s, with Prev, Next and Play. Play steps through the Guesses on a timer, fading the columns out between steps, and stops at the Win.
  - The current Candidate Set size is shown beside the strip ("2,315 → 147 → 12 → 1").

Every input is a URL param (`answer`, `pool`, `scope`, `by`, `opener`, `step`, `view`, `zoom`, `centre`), so a view can be shared. Page text lives in the typed page text table for both languages.

## User Stories

1. As a reader, I want a "Feedback Matrix" link under Explore in the sidebar and in the phone menu, so that I can find the page from anywhere.
2. As a reader, I want to see the whole Answer × Answer Feedback Matrix as one picture, so that I can see what the Solver looks Feedback up in.
3. As a reader, I want each cell's colour to stand for its Feedback Code, with a legend, so that I can read the picture.
4. As a reader, I want the Win cells on the diagonal, so that the picture has an obvious landmark.
5. As a reader, I want to hover or tap a cell and see its Guess, Answer and Feedback, so that I can check any pair.
6. As a reader, I want to zoom in, so that I can pick out single cells, including on a phone.
7. As a reader, I want to pick an Answer, a Strategy and an Opener, so that I can watch the Solver play any Game.
8. As a reader, I want the Answers that are no longer Candidates dimmed after each Guess, so that I see the Candidate Set shrink.
9. As a reader, I want the rows of the Guesses played outlined, so that I see which rows of the matrix the Solver used.
10. As a reader, I want the Answer's column marked, so that I can follow it to the end.
11. As a reader, I want Prev, Next and Play, so that I can step through the Game or watch it play out.
12. As a reader, I want the Candidate Set size at each step, so that I can put numbers on what I see.
13. As a reader, I want every input in the URL, so that I can share exactly what I am looking at.
14. As a Thai reader, I want the page under `/th`, with Thai page text and the Thai font, so that it works in my language.
15. As a reader on a phone, I want the grid to fit the screen width without the page scrolling sideways, so that the page works on a phone.
16. As a reader using a keyboard, I want every control reachable, so that I don't need a mouse.
17. As a video maker, I want Play to give a clean, steady animation, so that I can record it for the video.

## Implementation Decisions

- **Glossary**: no new term. The page draws the existing **Feedback Matrix** (its Answer List one) and dims non-**Candidates**.
- **Backend**: a new `GET /api/feedback-matrix` returns the Answer × Answer matrix as raw bytes (`application/octet-stream`, gzipped): 2,315 × 2,315 `uint8`, row by row, rows = Guess, columns = Answer, both in Answer List order. It is read once from the `.npy` the backend already loads, with the header stripped, and cached with a long `Cache-Control`. 503 if the matrix is missing, as elsewhere.
  - The Answer List words (the axis labels) come from the frontend's build-time Answer List (sorted), passed to the view as a prop; no new endpoint. Ticket 01 checks that the matrix order matches it.
- **The Game**: one `GET /api/solve` call (with `opener` when given). The Candidate Set after each Guess is worked out on the frontend from the steps' Guesses and Feedback with the existing `/api/candidates` (one call per step, cached), since a Guess List Guess has no row in this matrix.
- **New pure frontend module (matrix grid)**, tested on its own:
  - Feedback Code → colour index on the scale;
  - the viewport (a zoom, 1 at fit, and the grid point at the frame's centre): zoom around a point, pan, clamping to the grid's edges and to the most zoom (a cell 40 px wide), the cells in view, and the `zoom` / `centre` URL params (the old stepped `zoom` values `fit`, `2`, `4`, `8` still read);
  - pixel → (row, column) at any zoom and centre, and back;
  - the a–z tick positions (the first index of each letter in the Answer List) and the ticks in view at a zoom and pan, with overlapping labels dropped;
  - the Candidate view's one-row colours (blue to grey by each column's level);
  - the dimmed-column mask for a step from the Candidate Sets;
  - the Candidate Set sizes per step;
  - which Guesses have a row.
- **Drawing**: an `ImageData` the size of the grid (one pixel per cell) is filled once from the bytes and the colour scale; each draw copies only the cells in view onto a canvas the frame's size, scaled, with smoothing off. Dimming is a second layer (a one-pixel-per-column image drawn stretched over the grid), so a step change does not refill 5.4 million pixels. The Candidate view fills that same layer with opaque blue and grey and skips the grid image, so switching views never refills the grid image. Theme changes refill both.
- **Theme**: the Candidate view's blue is a new web-only theme role, `--candidate` (each palette's own blue), added to every block of `themes.css`; grey is `--muted`.
- **Fit and gestures**: the frame's side is the smaller of the content width and the viewport height less the sticky strip, the toolbar and the x axis; the frame has `overflow: hidden`. The wheel listener is not passive, so it zooms instead of scrolling the page (zooming out at fit still scrolls the page). `touch-action` is `pan-y` at fit and `none` when zoomed. The zoom and centre are written to the URL once they settle, not on every frame.
- **Page**: a view component taking the language, rendered by both route groups, like `FollowView`. Added to `EXPLORE_PAGES` with its text keys.
- **Docs**: `web-frontend.md`, `web-backend.md` and the `INDEX.md` summaries are updated with each change.

## Testing Decisions

- **Backend, through the HTTP endpoint**: the matrix endpoint returns 2,315² bytes; cell `[g, a]` equals the Feedback of Answer List words g and a (spot checks, including a repeated-letter pair); every diagonal cell is 242; 503 when the matrix is missing.
- **Frontend, the pure matrix-grid module** with `bun test`: colour indices at 0 and 242, pixel ↔ cell at any zoom and centre including the edges, zoom around a point, pan and clamping, the a–z ticks (letters with very few words, crowded labels), the URL params, the dimmed mask from a recorded solve response, sizes per step, Guesses with no row.
- No unit tests for React components, as elsewhere. `bun run screenshot` gets the page (top of page, light and dark, phone and desktop). `page-text.test.ts` and `paths.test.ts` cover the new text and paths.

## Out of Scope

- The Guess × Answer matrix (14,855 rows, 34 MB) as the y axis.
- Reordering rows or columns (by Expected Information, by clustering).
- Dimming rows (Guesses that no longer split the Candidate Set).
- Typing a State by hand instead of following the Solver.
- Hard Mode.
- A Widget form embedded in an Article (a Margin note from an Article may come later).

## Further Notes

- 5.4 MB raw; the bytes are highly repetitive (most cells are low codes), so gzip should cut them a lot. Measure before deciding whether a smaller encoding is needed.
- At fit zoom one cell is less than a pixel on most screens, so hover picks the cell under the pointer at the grid's resolution; zooming in is there so a reader can be precise.
