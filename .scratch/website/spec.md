# Spec: Website for Articles on solving Wordle

Status: ready-for-agent

A personal website that hosts Articles (the scripts behind the user's videos). Each Article explains one idea. Widgets inside the Articles let readers try those ideas against a live Solver. Terms follow [GLOSSARY.md](../../GLOSSARY.md), including the Publishing section (Article, Prerequisite, Series, Widget).

## Shape

- `app/backend/`: Python and FastAPI (served by uvicorn), its own uv project outside the root workspace. It **reuses the engine from `packages/wordle`** (a uv path dependency): the word lists, Feedback, Candidates, the Feedback matrices and the Solver's Strategy all come from the package. The backend adds only the web layer and what the website needs on top:
  - `wordle_backend/main.py` is the FastAPI entry point (`uvicorn wordle_backend.main:app`); the endpoints live in `wordle_backend/routers/*.py`, one module per area,
  - its precompute command writes the Feedback matrices (with the package's builder) and the Benchmark and Opener results into `app/backend/matrices/` (gitignored).
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

- **Articles**: `app/frontend/content/articles/<slug>.mdx`, with frontmatter `title`, `summary`, `prerequisites: [slug]`, `part`, and an optional `video` timestamp. The file is named `NN-slug.mdx` (two-digit number, then the URL slug); the number is the Article's place in the Series and the build fails on a bad prefix, a repeated number or slug, or numbers that are not 01..N. Each Article page lists its Prerequisites and shows backlinks (the Articles that list it as a Prerequisite).
- **Series**: the site has exactly one Series, "Solving Wordle", in `content/series.mdx` (title, intro, video embed). Every Article belongs to it; there is no Series index and no `/series/` route. Each Article shows prev/next links.
- **Parts**: defined in order in `content/series.mdx` (an id, a title and a short intro each). Every Article names its `part`, and the file numbers run through the whole Series, so a Part's Articles are consecutive. Article numbers always show as two digits with leading zeros (`01` … `10`).
- **Home page**: the Series itself: its title, intro and video, then each Part with its intro and its Articles in number order.
- **Math**: `@next/mdx` with `remark-math` and `rehype-katex`.
- **`<Term>Candidate Set</Term>`**: shows that term's definition from the root `GLOSSARY.md`, parsed at build time. An unknown term fails the build.
- **Themes**: the gpui app's ten palettes, with the same role names (`background`, `surface`, `overlay`, `text`, `correct`, `present`, `absent`, `heading`, `accent`, …) as CSS variables. The default follows the system setting (Rosé Pine Dawn for light, Rosé Pine for dark). The picker's choice is saved in `localStorage`.
- **Charts**: TanStack Charts (`@tanstack/react-charts`), coloured from the theme roles.
- **Widgets** take their starting state from MDX props, and URL query params override it, so video takes can be reproduced exactly:
  1. Feedback scorer (Guess and Answer → Marks, with the repeated-letter rule spelled out)
  2. Candidate filter (enter a State, watch the Candidate Set shrink)
  3. Feedback Split explorer (bar chart of the groups, Expected Information, Expected Candidates)
  4. Step-through Game (the Solver plays a chosen Answer one Guess at a time)
  5. Opener table
  6. Benchmark chart

## The "Solving Wordle" Series

English, written in glossary terms only. Colours appear only in the Widgets and in `<Mark>` labels (Correct, Present, Absent in their tile colours). The Articles are grouped into two Parts; each Part has a title and a short intro.

**Part 1: Wordle** (learn the game, then build it)

1. The rules: Answer, Guess, Answer List and Guess List, a Win within six Guesses → no Widget
2. Feedback (the two-pass repeated-letter rule) → Feedback scorer
3. Building the Game in Python: the State, each Guess and the game loop → no Widget

**Part 2: Solving Wordle** (an introduction that guides the reader's thinking towards the best Opener)

4. Introduction: what makes a good first Guess? → no Widget. Adds the maths: two ways to score a Guess, both built on the same idea. A Guess splits the $N$ Candidates into groups of sizes $n_i$, one per Feedback, and that Feedback turns up with probability $p_i = n_i / N$. Each criterion scores what is left after one Feedback and takes the expected value over the split:
   - minimise the Expected Candidates (the expected number of possible Answers left): $\mathbb{E}[\text{left}] = \sum_i p_i \, n_i = \frac{1}{N}\sum_i n_i^2$
   - maximise the Expected Information (the information gain in bits): $\mathbb{E}[\text{bits}] = \sum_i p_i \log_2 \frac{N}{n_i} = -\sum_i p_i \log_2 p_i$

   The Article states the shared idea explicitly (an expectation over the Feedback Split, differing only in the score of each group: its size, or how many halvings it saves), and notes why they can disagree (a big group counts quadratically in one and logarithmically in the other). Article 06 then builds the Feedback Split and shows both numbers in the Split explorer.
5. Candidate Set → Candidate filter
6. Feedback Split and Expected Information (one Article: the groups first, then scoring them in bits, $-\sum p \log_2 p$, "entropy" named once) → Split explorer, without then with bits
7. Openers → Opener table
8. Greedy Strategy (non-Candidate Guesses, the _ATCH trap) → Step-through Game
9. Benchmark → Benchmark chart
10. Greedy vs optimal (the true optimum is cited, not computed) → no Widget

## Out of scope

Play and Assist pages, Hard Mode, computing an optimal decision tree, and hosting/deployment (a later ticket: Vercel plus a FastAPI container that builds its matrices during `docker build`).

## Docs

Add `docs/documents/web-backend.md` and `docs/documents/web-frontend.md`, link them from `INDEX.md`, and update `architecture.md`'s layout and commands. Each ticket keeps these in step with its code.
