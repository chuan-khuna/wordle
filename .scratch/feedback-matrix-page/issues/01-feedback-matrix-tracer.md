# 01: Feedback Matrix tracer: the whole grid

**What to build:** A reader follows a new "Feedback Matrix" link under Explore (in the sidebar and in the phone top-bar menu, in English and Thai). The page `/matrix` (`/th/matrix`) draws the Answer × Answer Feedback Matrix on a canvas, fitted to the content width: x is the Answer, y is the Guess, both in Answer List order (alphabetical), so the Win cells form the diagonal. Each cell's colour is its Feedback Code (0 to 242) on one sequential scale built from the theme's colours, with a legend. See [the spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `GET /api/feedback-matrix` returns the Answer × Answer matrix as raw `uint8` bytes (`application/octet-stream`, gzipped), row by row, rows = Guess, columns = Answer, with a long `Cache-Control`. 503 when the matrix is missing, as elsewhere.
- [x] The matrix's row/column order is checked to equal the frontend's build-time Answer List order (sorted); the axis words come from that build-time list, not a new endpoint.
- [x] Backend tests through the HTTP endpoint: 2,315² bytes; cell `[g, a]` equals the Feedback of words g and a (spot checks, including a repeated-letter pair); every diagonal cell is 242; 503 when missing.
- [x] A pure matrix-grid module maps a Feedback Code to a colour index on the scale; `bun test` covers 0, a middle code and 242.
- [x] The grid is drawn from a one-pixel-per-cell image filled once, scaled with smoothing off; a theme change refills it, in all ten themes, light and dark.
- [x] A legend shows the scale with a few labelled Feedbacks as Tiles (`00000`, a middle code, `22222`).
- [x] The page is a view component taking the language, rendered by both route groups; it is added to the Explore list after Follow an Answer, with all text in the page text table for both languages (`page-text.test.ts`, `paths.test.ts` pass).
- [x] On a phone the grid fits the width and the page never scrolls sideways.
- [x] `bun run screenshot` includes the page (light and dark, phone and desktop).
- [x] `web-backend.md`, `web-frontend.md` and their `INDEX.md` summaries describe the endpoint, the page and the Explore link.
