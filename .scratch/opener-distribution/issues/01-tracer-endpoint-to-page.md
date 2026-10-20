# 01: Opener Distribution tracer: endpoint to `/openers` page

**What to build:** A reader opens `/openers` (linked from the sidebar under an "Explore" heading below the Parts, and from the top-bar menu on phones) and sees the Opener Distribution for the `bits-all` Strategy: every one of the 14,855 Openers drawn as one block, stacked in bars 0.01 wide by Average Guess Count (rounded half-up), with the best-ranked Opener at the bottom of each stack. The x axis is the Average Guess Count; the y axis is the number of Openers. The backend serves the data from the Guess Count Matrix summary through a new endpoint. When the summary is missing, the Widget says to run `just precompute-guess-counts` or `just restore-cache`. See [the spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The backend loads the Guess Count Matrix summary at startup if it exists. It stays optional: without it the backend still starts.
- [x] `GET /api/guess-counts?strategy=<id>` (default `bits-all`) returns `{strategy: {id, name}, complete_rows, total_rows, openers: [{rank, word, average_guess_count, losses, is_answer}]}`, with Openers in summary rank order. It answers 400 for an unknown Strategy and 503 when the summary is missing. The response is gzipped.
- [x] Backend tests go through the HTTP endpoint with a fixture summary swapped into app state (the same pattern as the Benchmark endpoint tests). They cover the shape, the rank order, the default Strategy, the 400, the 503 and `complete_rows`/`total_rows`.
- [x] A pure grouping function turns Openers into bars. Each bar is a stack of Openers in rank order, and empty bars between the first and last occupied bar are kept. Rounding is half-up and exact at the .xx5 edges: no float error puts an Opener in the wrong bar.
- [x] `bun test` covers the grouping function: rounding at the edges, stack order and empty bars.
- [x] The `<OpenerDistribution>` Widget draws custom SVG in theme-role colours (one block per Opener, coloured by Answer List membership) and shows the "not precomputed" message on 503.
- [x] The `/openers` page, titled "Opener Distribution", shows the Widget full width. The sidebar and the phone top bar link to it under "Explore".
- [x] `web-backend.md`, `web-frontend.md` and their `INDEX.md` summaries describe the endpoint, the Widget, the page and the Explore link.
