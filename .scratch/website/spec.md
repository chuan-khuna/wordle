# Spec: Website for Articles on solving Wordle

Status: ready-for-agent

A personal website that hosts Articles (the scripts behind the user's videos). Each Article explains one idea. Widgets inside the Articles let readers try those ideas against a live Solver. Terms follow [GLOSSARY.md](../../GLOSSARY.md), including the Publishing section (Article, Prerequisite, Series, Widget).

## Shape

- `app/backend/`: Python and FastAPI (served by uvicorn), a **standalone** uv project. It is not a workspace member and never imports `packages/wordle`. Like `app/wordle-gpui`, it has:
  - its own copies of `answers.txt` / `guesses.txt` / `SOURCES.md` (from `packages/wordle/src/wordle/data/`),
  - its own Feedback, Candidates and Strategy code,
  - its own precompute command, which writes the Feedback matrices and the Benchmark results into `app/backend/matrices/` (gitignored). The `.npy` files are byte-identical to the other two apps' files.
- `app/frontend/`: Next.js (App Router), TypeScript, Tailwind and bun. `bunfig.toml` sets `minimumReleaseAge = 604800` and `.npmrc` sets `min-release-age=7`.
- Runs locally for now: `just backend`, `just frontend`, `just web` (both), `just backend-precompute`, `just test-backend`. Next proxies `/api/*` to FastAPI through `rewrites`, and the backend URL comes from an env var (`BACKEND_URL`), so a later deployment only needs config.

## Backend API (JSON; words are lowercase five-letter strings)

| Endpoint | Returns |
| --- | --- |
| `GET /api/feedback?guess=&answer=` | the five Marks and the Feedback Code |
| `POST /api/candidates` `{state: [{guess, feedback}]}` | the Candidate Set |
| `POST /api/split` `{guess, state}` | the Feedback Split (groups with their words), Expected Information, Expected Candidates |
| `POST /api/suggestions` `{state, pool, scope, by, top}` | ranked Guesses with their bits and Expected Candidates |
| `GET /api/solve?answer=&pool=&scope=&by=` | a step-through Game: each Guess, its Feedback, Candidate Set size before and after, and the top alternatives at that step |
| `GET /api/openers?top=` | the Opener leaderboard (precomputed) |
| `GET /api/benchmark` | the Guess Distribution and Average Guess Count for each Benchmark Strategy (precomputed) |

Invalid words return 400 with a message. The Strategy options mirror the Python Solver: `pool` is answers or guesses, `scope` is candidates or global, `by` is bits or expected. Ties go to a Candidate, then to the other measure, then to alphabetical order. Once two or fewer Candidates are left, the search switches to Candidates only. See `docs/documents/solver-strategy.md`.

The Benchmark runs three Strategies, each from its own best Opener:
1. Expected Information over All words (Guess List)
2. Expected Information over Candidates only
3. Expected Candidates over All words

## Frontend

- **Articles**: `app/frontend/content/articles/<slug>.mdx`, with frontmatter `title`, `summary`, `prerequisites: [slug]`, `series`, `order`, and an optional `video` timestamp. Each Article page lists its Prerequisites and shows backlinks (the Articles that list it as a Prerequisite).
- **Series**: `content/series/<slug>.mdx` (title, intro, video embed). The Series page lists its Articles in `order`, and each Article in a Series shows prev/next links.
- **Index page**: lists the Series and the Articles.
- **Math**: `@next/mdx` with `remark-math` and `rehype-katex`.
- **`<Term>Candidate Set</Term>`**: shows that term's definition from the root `GLOSSARY.md`, parsed at build time. An unknown term fails the build.
- **Themes**: the gpui app's ten palettes, with the same role names (`background`, `surface`, `overlay`, `text`, `correct`, `present`, `absent`, `heading`, `accent`, …) as CSS variables. The default follows the system setting (Rosé Pine Dawn for light, Rosé Pine for dark). The picker's choice is saved in `localStorage`.
- **Widgets** take their starting state from MDX props, and URL query params override it, so video takes can be reproduced exactly:
  1. Feedback scorer (Guess and Answer → Marks, with the repeated-letter rule spelled out)
  2. Candidate filter (enter a State, watch the Candidate Set shrink)
  3. Feedback Split explorer (bar chart of the groups, Expected Information, Expected Candidates)
  4. Step-through Game (the Solver plays a chosen Answer one Guess at a time)
  5. Opener table
  6. Benchmark chart

## The "Solving Wordle" Series

English, written in glossary terms only. Colours appear only in the Widgets.

1. Feedback → Feedback scorer
2. Candidate Set → Candidate filter
3. Feedback Split → Split explorer
4. Expected Information (bits, $-\sum p \log_2 p$, "entropy" named once) → Split explorer with bits
5. Greedy Strategy (non-Candidate Guesses, the _ATCH trap) → Step-through Game
6. Openers → Opener table
7. Benchmark → Benchmark chart
8. Greedy vs optimal (the true optimum is cited, not computed) → no Widget

## Out of scope

Play and Assist pages, Hard Mode, computing an optimal decision tree, and hosting/deployment (a later ticket: Vercel plus a FastAPI container that builds its matrices during `docker build`).

## Docs

Add `docs/documents/web-backend.md` and `docs/documents/web-frontend.md`, link them from `INDEX.md`, and update `architecture.md`'s layout and commands. Each ticket keeps these in step with its code.
