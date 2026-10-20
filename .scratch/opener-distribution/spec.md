# Opener Distribution: every Opener played out, on the website

Status: ready-for-agent

Builds on [the Guess Count Matrix](../guess-count-matrix/spec.md) (all four Strategies are complete: 14,855 Openers each) and [the website](../website/spec.md).

## Problem Statement

The website ranks Openers only by Expected Information (`<OpenerTable>`, Article 07) and benchmarks one Opener per Strategy (Article 09). The Guess Count Matrix answers a better question, "how many Guesses does each Opener need when the Solver plays the rest?", for every Guess List word, but nothing on the website shows it.

## Solution

An **Opener Distribution** chart (see `GLOSSARY.md`): for one Strategy, the Openers grouped into bars by Average Guess Count rounded to two decimals, each Opener drawn as one block stacked in its bar.

- **Backend**: `GET /api/guess-counts?strategy=<id>` (default `bits-all`). Reads `precompute-cache/guess-counts/summary.json` once at startup; it is optional, so it answers 503 when missing (like `/api/benchmark`) and 400 for an unknown Strategy. It returns `{strategy: {id, name}, complete_rows, total_rows: 14855, openers: [{rank, word, average_guess_count, losses, is_answer}]}`, every Opener in summary rank order. Gzip the response (about 15k entries).
- **Widget** `<OpenerDistribution>` (custom SVG, not TanStack Charts):
  - x: Average Guess Count in 0.01 steps, labelled every 0.05; y: number of Openers.
  - One `<rect>` per Opener. Within a bar, the summary's rank goes from bottom to top (lowest unrounded average first, then Expected Information, then alphabetical).
  - Blocks are coloured by theme roles: Answer List word vs not. Highlighted words get an accent colour and a label.
  - Hover or tap shows a tooltip with the word, rank, Average Guess Count (3 decimals), Losses and Answer List yes/no.
  - Props / URL params (as other Widgets, `id`-namespaced): `strategy`, `answersOnly`, `highlight` (comma list), `controls` (show the Strategy picker, the Answer List toggle and the highlight word box).
  - On a phone the chart keeps a minimum bar width and scrolls sideways inside its own frame; the page never scrolls sideways.
  - 503: show "Run `just precompute-guess-counts` (or `just restore-cache`)", like `<BenchmarkChart>`. If `complete_rows < total_rows`, chart what there is with a note "N of 14,855 Openers played".
- **Page** `/openers`, titled "Opener Distribution". It shows the Widget full width with all controls; the Answer List toggle is off by default, so all 14,855 Openers show. A short intro links to Article 11. The sidebar links to it under an "Explore" heading below the Parts, and so does the top-bar menu on phones.
- **Article** `11-opener-distribution.mdx`, Part `solving-wordle`, `prerequisites: [benchmark]`. Outline:
  1. The Benchmark played one Opener per Strategy. Now play every Guess List word as the Opener: the Guess Count Matrix, 14,855 × 2,315 Games per Strategy.
  2. Each Opener's Average Guess Count, then the embedded Widget: `bits-all` fixed, no controls, Answer List only, `highlight="tarse,salet,raise,crane"`.
  3. Findings from `summary.json`: under `bits-all` the best Opener is tarse (3.429) and the worst qajaq (4.117), which is less than one Guess between them. Raise ranks 95th and crane 7th. Under the Candidates-only Strategy salet is best (3.528) and raise ranks 420th.
  4. Ranking by Expected Information and ranking by play disagree.
  5. A link to "See the full Opener Distribution →" `/openers`.
- **Series**: the intro says "eleven short Articles", and the Solving Wordle Part intro adds "…and how every possible Opener fares when played out".

## Decisions

- **Rounding**: bars are 0.01 wide, rounded half-up. Compute the bar from the exact integers (the row's Guess Count total over 2,315), or from the float plus a tiny epsilon. That way a value like 3.525 doesn't fall into the wrong bar through float error. Pin it with a test.
- **The frontend does the grouping**, so the Answer List toggle and the highlights need no new request.
- **One block per Opener, not count bars**: bars hold up to about 670 Openers, so words are printed only on highlighted blocks; the tooltip names the rest.
- **The Article is appended as 11** rather than slotted in between: existing numbers, links and video timestamps stay unchanged.
- **Default Strategy is `bits-all`**, the Solver's own (`suggest()` defaults).

## Testing

- Backend: the endpoint's shape, rank order, the default Strategy, 400 for an unknown Strategy, 503 without `summary.json` (fixture summary, not the real cache).
- Frontend: the grouping into bars (rounding at .xx5 boundaries, stack order, the Answer List filter) as pure functions.
- Article build validation passes (frontmatter, prerequisite, Part).

## Docs

In the same change, update `web-backend.md` (the endpoint and the optional summary), `web-frontend.md` (the Widget, `/openers`, the sidebar's Explore heading, Article 11) and their summaries in `docs/documents/INDEX.md`.

## Out of scope

- Showing the Guess Distribution per Opener (the gpui Solver panel already does).
- Comparing Strategies side by side in one chart.
