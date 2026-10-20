# Web frontend

The Next.js app behind the website, in `app/frontend/`. It is built with the App Router, TypeScript, Tailwind CSS v4 and bun. The website's plan is in `.scratch/website/spec.md`; the API it talks to is in [web-backend.md](web-backend.md).

## Layout

```
app/frontend/
  package.json, bun.lock    bun is the package manager (never npm)
  bunfig.toml               minimumReleaseAge = 604800 (7 days)
  .npmrc                    min-release-age=7
  next.config.ts            the /api rewrite to BACKEND_URL, and @next/mdx with its plugins
  content/
    articles/<slug>.mdx     Articles (frontmatter + MDX)
    series/<slug>.mdx       Series
  src/
    mdx-components.tsx      components every MDX file can use without importing (<Term>, the Widgets)
    app/
      layout.tsx            <html>, the no-flash theme script, the site header with the theme picker, KaTeX CSS
      page.tsx              the index page: the Series and all Articles
      articles/[slug]/      an Article page
      series/[slug]/        a Series page
      globals.css           Tailwind, and the CSS variables mapped to Tailwind colours
      themes.css            the ten palettes as CSS variables (generated from the gpui themes)
    components/ThemePicker.tsx
    components/Term.tsx, VideoEmbed.tsx, ArticleList.tsx
    components/widgets/     the Widgets: FeedbackScorer, CandidateFilter, SplitExplorer (with GroupChart), StepThroughGame, OpenerTable, BenchmarkChart, Tile, ui, useWidgetParam, useLoad
    lib/feedback.ts         TypeScript port of the Feedback scorer, with its step trace (feedback.test.ts)
    lib/widget-state.ts     the `guess:feedback,...` State text format
    lib/api.ts              fetch helpers and response types for /api (errors carry the API's `detail`)
    lib/content.ts          reads and validates content/ (frontmatter via gray-matter)
    lib/glossary.ts         parses the root GLOSSARY.md for <Term>
    lib/themes.ts           the theme ids, names and appearance, in the gpui picker's order
    lib/theme-script.ts     the inline script that sets the theme before paint
```

Versions (current when the app was made, all at least 7 days old): Next 16.4, React 19.3, Tailwind 4.3, TypeScript 6 (typescript-eslint does not support 7 yet).

## Commands

| Command | What it does |
| --- | --- |
| `just frontend` | Dev server on http://localhost:3000 (takes `next dev` options, e.g. `--port 3001`) |
| `just web` | Backend (port 8000) and frontend (port 3000) together; Ctrl-C stops both |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | Unit tests (`src/lib/*.test.ts`); the cross-check against `/api/feedback` runs when the backend is up |

Run `just backend-precompute` once first, or the backend answers 503 where it needs the matrices.

## The API proxy

`next.config.ts` rewrites `/api/:path*` to `${BACKEND_URL}/api/:path*`, so the browser only talks to Next and no CORS is needed. `BACKEND_URL` is read when the server starts and defaults to `http://127.0.0.1:8000`; set it to point at another backend (`BACKEND_URL=http://backend:8000 just frontend`). Try it: `curl 'http://localhost:3000/api/feedback?guess=crane&answer=speed'`.

## Themes

The gpui app's ten palettes (see [gpui-app.md](gpui-app.md)) with the same role names. `themes.css` has one `[data-theme="<id>"]` block per theme, with these variables:

- plain roles: `--background`, `--surface`, `--overlay`, `--highlight-low`, `--highlight-med`, `--highlight-high`, `--text`, `--subtle`, `--muted`, `--heading`, `--error`, `--success`, `--accent`,
- Paint roles, a fill and the colour of the letter on it: `--correct`, `--present`, `--absent`, `--absent-key`, each with `--on-correct`, `--on-present`, `--on-absent`, `--on-absent-key`.

`globals.css` maps each to a Tailwind colour of the same name (`@theme inline`), so components write `bg-surface`, `text-subtle`, `border-highlight-med`, or a tile as `bg-correct text-on-correct`. Components never use fixed colours, so every theme works everywhere. When a gpui palette changes, update `themes.css` and `themes.ts` to match.

**Default and choice.** With no saved choice ("System" in the picker) the theme follows `prefers-color-scheme`: Rosé Pine Dawn for light, Rosé Pine for dark, and it changes live with the system setting. Picking a theme saves its id in `localStorage` (`wordle-theme`); picking System removes it.

**No flash.** `layout.tsx` puts an inline script (`lib/theme-script.ts`) in `<head>`. It runs before the first paint: it reads `localStorage` (inside `try/catch`, since storage can be blocked), falls back to the system setting, and sets `data-theme` and `data-theme-choice` on `<html>`. `<html>` has `suppressHydrationWarning` because of that. `ThemePicker` reads `data-theme-choice` with `useSyncExternalStore` (the server renders "System"), and changes the theme by saving the choice and dispatching a `wordle-theme` event that the script listens for.

## Articles and Series

Content lives in `content/`, outside `src/`. Every page is statically generated (`generateStaticParams`, `dynamicParams = false`), so an unknown URL is a 404.

**MDX pipeline.** `next.config.ts` wraps the config in `@next/mdx`. The remark and rehype plugins are named by string with serialisable options (`"remark-frontmatter"`, `"remark-math"`, `["rehype-katex", {...}]`), because Turbopack cannot be handed functions. `app/layout.tsx` imports `katex/dist/katex.min.css`. KaTeX is set to throw on bad maths, so a typo in a formula fails the build.

**Frontmatter.** `remark-frontmatter` only strips the `---` block from the rendered output. The data is read by `lib/content.ts` with gray-matter, straight from the files with `fs`. That gives the index, the backlinks and the validation one plain function over all files, with no need to compile and import every MDX file to read a few fields.

**Add an Article.** Create `content/articles/<slug>.mdx`:

```mdx
---
title: "Feedback Split"
summary: "One line shown in lists."
prerequisites: [candidate-set]   # slugs of other Articles, or []
series: solving-wordle           # a slug in content/series/
order: 3                         # position in the Series, unique within it
video: "4:10"                    # optional: where it starts in the Series video ("m:ss", "h:mm:ss" or seconds)
---

Body in MDX. Inline maths $x^2$, display maths in `$$ ... $$`, and <Term>Feedback Split</Term>.
```

The Article page shows its Series and position, its Prerequisites (from `prerequisites`), the Articles that list it as a Prerequisite ("Builds on this Article", the backlinks), and previous and next links within its Series.

**Series side nav** (`components/SeriesNav.tsx`). It lists the Series title (a link to the Series page) and every Article of the Series in `order`, as number and title; the current Article has `aria-current="page"` and is styled with theme roles (`border-accent bg-highlight-low text-heading`). From the `lg` breakpoint (1024px) it is a column beside the Article (grid `14rem` + the rest), `position: sticky` so it stays in view while scrolling, and it scrolls inside itself if the Series is long. Below that it is a collapsed `<details>` above the Article, so the page never scrolls sideways. The list is rendered twice and CSS shows one of the two, so there is no client JavaScript. The site `<main>` is `max-w-6xl` so Widgets have room; text blocks of the prose (paragraphs, lists, headings, quotes) are capped at 70ch while Widgets and display maths use the full column. The index and Series pages stay `max-w-3xl`.

**Add a Series.** Create `content/series/<slug>.mdx` with frontmatter `title`, `intro` and optional `video` (a YouTube id or URL), then optional MDX body text. The Series page embeds the video and lists its Articles in `order`, each with a "Watch from m:ss" link.

**Video timestamps.** An Article's `video` is a start time in its Series' video. Only the Series page uses it, as a "Watch from m:ss" link to YouTube (`&t=<seconds>s`) beside each Article; the Article page itself shows no video. An Article without `video`, or in a Series without one, has no link.

**Build-time checks** (`lib/content.ts`; a failure stops `bun run build` with the file name in the message): unknown Series, unknown Prerequisite, an Article that is its own Prerequisite, a Prerequisite cycle, two Articles with the same `order` in a Series, and missing or malformed frontmatter.

**Sample content.** `content/*/sample-*` is placeholder, written to exercise all of this. The real Series replaces it in a later ticket.

## `<Term>`

`<Term>Candidate Set</Term>` works in any MDX file with no import (`src/mdx-components.tsx`). It looks the term up, case-insensitively, in the repo's root `GLOSSARY.md`, which `lib/glossary.ts` parses at build time: a `**Term**:` line, then its definition lines up to the blank line, ignoring `_Avoid_:` lines. It renders underlined text with the definition as a tooltip on hover and on keyboard focus (`tabIndex=0`, `role="tooltip"`, `aria-describedby`). When the shown text differs from the term, name the term: `<Term of="Candidate">candidates</Term>`.

A term that is not in the glossary throws while the page is prerendered, so `bun run build` fails with `<Term>: "..." is not defined in GLOSSARY.md`. In `next dev` the error shows on that page.

## Maths

Write `$inline$` and `$$display$$` (remark-math, rendered by rehype-katex). Prose is styled by `@tailwindcss/typography` as `prose prose-theme`, where `prose-theme` (in `globals.css`) sets the typography colours from the theme roles.

## Widgets

Interactive figures, registered in `mdx-components.tsx` (no import needed). They are Client Components wrapped in `<Suspense>` (they read the URL with `useSearchParams`, which a static page needs). Tiles use the theme roles (`bg-correct text-on-correct` and so on); Marks are also in each tile's `aria-label`, so colour is never the only cue.

**Starting state and URL params.** A Widget starts from its MDX props. A URL query param of the same meaning overrides the prop, so a video take can be reproduced from a link. Edits are written back to the URL with `history.replaceState` (the param is removed again when it equals the prop), so the address bar is always a link to the current take. Params are read once, when the Widget mounts.

**Two Widgets in one Article.** Give each an `id`; its params are then named `<id>.<name>` (`fb.guess`, `cs.state`). Without an `id` the plain names are used (`guess`, `answer`, `state`), so two Widgets of the same kind without ids would share state.

### Feedback scorer

```mdx
<FeedbackScorer id="fb" guess="speed" answer="abide" />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `guess`, `answer` | `guess`, `answer` (or `<id>.guess`, `<id>.answer`) | starting words, letters only |
| `id` | | namespace for the params |

Shows five tiles, then the two passes worked out for that pair (Correct first; then left to right, a letter is Present while the Answer still has an unused copy, otherwise Absent), as in [feedback-scoring.md](feedback-scoring.md). Example link: `/articles/sample-feedback?fb.guess=eerie&fb.answer=crane`.

**Local and API.** The Marks and the explanation come from a TypeScript port (`lib/feedback.ts`), so they update at once and the explanation has its steps. After a short pause the Widget also calls `GET /api/feedback`: it is the authority on which words are on the Guess List (a 400 shows its message, e.g. `guess 'zzzzz' is not a valid five-letter word`) and a mismatch between its Marks and the port is reported. `lib/feedback.test.ts` checks the port against the repeated-letter examples of the scoring document, and against the running API when it is up (`BACKEND_URL`, default `http://127.0.0.1:8000`).

### Candidate filter

```mdx
<CandidateFilter id="cs" state="crane:00102,slate:01200" />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `state` | `state` (or `<id>.state`) | the State: rows `guess:feedback` joined by commas |
| `id` | | namespace for the param |

A row's feedback is five digits, 0 Absent, 1 Present, 2 Correct (`crane:00102`); a row without `:feedback` starts all Absent; malformed rows are dropped; at most six rows. In the Widget the reader types each Guess and clicks its tiles to cycle the Marks (Absent, Present, Correct). Every complete row shows its Candidate Set count before and after (`2309 → 49`), and below are the final count and the words (the first 48, with a button for all). It makes one `POST /api/candidates` per prefix of the State (Guess 0, 1, ..., n), so an invalid Guess or Feedback shows the API's message on its row; incomplete rows are ignored until they have five letters. Example link: `/articles/sample-candidate-set?cs.state=crane:20000`.

### Feedback Split explorer

```mdx
<SplitExplorer id="fs" guess="crane" state="slate:01200" bits={false} />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `guess` | `guess` (or `<id>.guess`) | the Guess to split on |
| `state` | `state` (or `<id>.state`) | optional State, `guess:feedback` rows joined by commas; the Candidate Set it leaves is what is split (default: the whole Answer List) |
| `bits` | | default `true`; `bits={false}` hides Expected Information (Article 3 shows the Split without it, Article 4 adds it) |
| `id` | | namespace for the params |

One `POST /api/split` (after a short pause) gives the groups, shown as a bar chart (one bar per Feedback, height = words in the group, x labelled with the Feedback digits) with Expected Candidates, the Candidate count, the group count and largest group, and Expected Information in bits unless hidden. A Guess can have up to about 150 groups, so the chart draws the 30 largest (`CHART_BARS`) and a scrollable list below holds every group, each with its tiles, Feedback and word count. Clicking a bar, or a list row (a button with `aria-pressed`), selects that group and lists its words (the first 60, with a button for all). An invalid Guess or State shows the API's message. Example link: `/articles/sample-expected-information?ei.guess=crane&ei.state=slate:01200`.

### Step-through Game

```mdx
<StepThroughGame id="g" answer="catch" step={2} />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `answer` | `answer` (or `<id>.answer`) | the Answer the Solver plays (must be on the Answer List) |
| `pool` | `pool` | `guesses` (default, all words) or `answers` |
| `scope` | `scope` | `global` (default, all Guesses) or `candidates` |
| `by` | `by` | `bits` (default, Expected Information) or `expected` (Expected Candidates) |
| `step` | `step` | the Guess shown, 1-based (default 1), clamped to the Game's length; edited by Prev/Next, so a video take can start at any step |
| `id` | | namespace for the params |

The defaults are the main Strategy: Expected Information over all Guesses. One `GET /api/solve` returns the whole Game; the Widget then shows tiles for each Guess so far, Prev and Next buttons (and the Left and Right arrow keys while focus is inside the Widget, outside its inputs), "Guess n of N", the Candidate Set size before and after the Guess, and a table of the Solver's top five Suggestions at that step with their bits, Expected Candidates and whether each is a Candidate (the first row is the Guess played). Example link: `/articles/sample-greedy-strategy?g.answer=watch&g.step=3`.

### Opener table and Benchmark chart (Widgets 5 and 6)

Both load their data once with the `useLoad` hook (`GET /api/openers`, `GET /api/benchmark`); a 503 from a backend that was not precomputed shows its message (including "Run `just backend-precompute` first.") as the error.

**Opener table** (`OpenerTable`). Props: `top` (default 20, 1 to 500), `highlight` (comma separated words, e.g. `"crane,slate"`), `id`. URL params `top`, `highlight` (`op.top` with `id="op"`) override the props. A table of rank, Opener, bits, Expected Candidates, groups, largest group and Candidate?. Every heading is a button that sorts by that column (click again to reverse; `aria-sort` is set). Highlighted words are emphasised and listed even when they rank below `top`; when `highlight` is set the Widget fetches all 500 rows. The table scrolls horizontally inside its card at phone width. A "Rows to show" input edits `top`.

**Benchmark chart** (`BenchmarkChart`). Props: `strategies` (comma separated ids from `bits-all`, `bits-candidates`, `expected-all`; default all three; unknown ids are dropped, none valid means all), `id`. URL param `strategies` (`bm.strategies`) overrides it. The chart is grouped bars (`barY` with `layout: group()`, `z` = Strategy): x is the Guess Count 1 to 6 plus a final "Lost" group for the Losses, so Losses are on the chart and not folded into the distribution; y is Games. Each Strategy has a fixed theme-role colour by its position in the API list (`--accent`, `--present`, `--correct`, `--error`), so it keeps its colour when a subset is shown. Below the chart a table gives each Strategy's Opener, Average Guess Count, Losses (red when above zero), and the exact Guess Distribution, then the lost Answers of each Strategy. Example link: `/articles/sample-benchmark?bm.strategies=bits-all,expected-all`.

### Charts

Charts use TanStack Charts: `@tanstack/react-charts` 1.1.0, which re-exports the `<Chart>` of its dependency `@tanstack/charts` (read `node_modules/@tanstack/charts/docs/` and `llms.txt`; it is not the old `react-charts` v3). A chart is a memoised `defineChart({ marks, scales, tooltip })` (marks such as `barY`, compact `scaleBand`/`scaleLinear` from `@tanstack/charts/scales/*`, the `tooltip` extension) passed to `<Chart definition height ariaLabel onSelect />`. `components/widgets/GroupChart.tsx` and `BenchmarkChart.tsx` are the charts; both use the shared `CHART_CLASS` wrapper from `ui.tsx`.

- **Theme roles.** Mark paints are CSS variables (`fill: "var(--accent)"`, the selected bar `var(--heading)`), so a theme change repaints with no rebuild; the axes, grid and labels use `currentColor`, set by a `text-subtle` wrapper; the tooltip colours are set from `--overlay` and `--text` through the library's `--ts-chart-tooltip-*` variables. Charts never use fixed colours.
- **SSR.** `<Chart>` server-renders SVG at `initialWidth` and then measures its container after hydration. The Widgets only mount a chart once the API data has arrived on the client, so no chart markup is rendered on the server and there is nothing to mismatch; a definition must not read `window` or other client-only values if a future chart is rendered on the server.
- **Interaction.** The chart is keyboard focusable (arrow keys move between bars, Enter selects); the same selection is available from the list below, which also gives the exact values as text.

All Widgets show loading and error states (`role="alert"` for errors, `aria-live` for results), use real labelled inputs and buttons so they work from the keyboard, and wrap at phone width.
