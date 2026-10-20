# Web frontend

The Next.js app behind the website, in `app/frontend/`. It is built with the App Router, TypeScript, Tailwind CSS v4 and bun. The website's plan is in `.scratch/website/spec.md`; the API it talks to is in [web-backend.md](web-backend.md).

## Layout

```
app/frontend/
  package.json, bun.lock    bun is the package manager (never npm)
  bunfig.toml               minimumReleaseAge = 604800 (7 days)
  .npmrc                    min-release-age=7
  components.json           shadcn/ui config (style radix-nova, aliases, lucide icons)
  next.config.ts            the /api rewrite to BACKEND_URL, and @next/mdx with its plugins
  content/
    series.mdx              the site's one Series and its Parts (frontmatter + MDX)
    articles/NN-<slug>.mdx  Articles (frontmatter + MDX); NN is the number in the Series
  src/
    mdx-components.tsx      components every MDX file can use without importing (<Term>, <Mark>, the Widgets)
    app/
      layout.tsx            <html>, the no-flash theme script, the sidebar, KaTeX CSS
      page.tsx              the home page, which is the Series page: title, intro, video, then each Part with its Articles
      articles/[slug]/      an Article page
      globals.css           Tailwind, the base body style, the prose-theme rules and KaTeX tweaks
      tokens.css            the design tokens: colour roles, fonts, type scale, space, measure, shape, focus, shared utilities
      themes.css            the ten palettes as CSS variables (generated from the gpui themes)
    components/ui/          shadcn/ui components (button, input, label, select, table, tooltip, dropdown-menu, collapsible), restyled with the tokens
    components/Sidebar.tsx, ThemePicker.tsx
    components/Term.tsx (server: glossary lookup), Mark.tsx (server: Mark label), TermTip.tsx (client: the tooltip shared by both), VideoEmbed.tsx
    components/widgets/     the Widgets: FeedbackScorer, CandidateFilter, SplitExplorer (with GroupChart), StepThroughGame, OpenerTable, BenchmarkChart, Tile, ui, useWidgetParam, useLoad
    lib/feedback.ts         TypeScript port of the Feedback scorer, with its step trace (feedback.test.ts)
    lib/widget-state.ts     the `guess:feedback,...` State text format
    lib/api.ts              fetch helpers and response types for /api (errors carry the API's `detail`)
    lib/content.ts          reads and validates content/ (frontmatter via gray-matter)
    lib/parts.ts            formatNumber, parseArticleFiles (NN-slug file names) and validateParts (parts.test.ts)
    lib/glossary.ts         parses the root GLOSSARY.md for <Term>
    lib/utils.ts            cn() (clsx + tailwind-merge), used by components/ui
    lib/themes.ts           the theme ids, names and appearance, in the gpui picker's order
    lib/theme-script.ts     the inline script that sets the theme before paint
```

Packages added for shadcn (all at least 7 days old when added, installed with `bun add` so `bunfig.toml` applies): `radix-ui` 1.8.1, `lucide-react` 1.55.0, `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `tw-animate-css` 1.4.0, `shadcn` 4.21.4 (its `shadcn/tailwind.css` is imported by `globals.css`).

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

`tokens.css` maps each to a Tailwind colour of the same name (`@theme inline`), so components write `bg-surface`, `text-subtle`, `border-highlight-med`, or a tile as `bg-correct text-on-correct`. Components never use fixed colours, so every theme works everywhere. When a gpui palette changes, update `themes.css` and `themes.ts` to match.

**Default and choice.** With no saved choice ("System" in the menu) the theme follows `prefers-color-scheme`: Rosé Pine Dawn for light, Rosé Pine for dark, and it changes live with the system setting. Picking a theme saves its id in `localStorage` (`wordle-theme`); picking System removes it.

**No flash.** `layout.tsx` puts an inline script (`lib/theme-script.ts`) in `<head>`. It runs before the first paint: it reads `localStorage` (inside `try/catch`, since storage can be blocked), falls back to the system setting, and sets `data-theme` and `data-theme-choice` on `<html>`. `<html>` has `suppressHydrationWarning` because of that. `ThemePicker` reads `data-theme-choice` with `useSyncExternalStore` (the server renders "System"), and changes the theme by saving the choice and dispatching a `wordle-theme` event that the script listens for.

**The theme menu** (`ThemePicker.tsx`): a shadcn `DropdownMenu` opened by an icon `Button` (lucide `Palette`, `aria-label="Theme"`). Its content is one `DropdownMenuRadioGroup`: "System", then the Light palettes under a "Light" label, then the Dark ones under "Dark"; the current choice is checked. Choosing an item runs the same save-and-dispatch as before (System removes the `localStorage` key). In the sidebar column it sits at the bottom, beside the word "Theme"; on phones it is in the top bar, next to the Articles button, so it is reachable without opening the menu.

## shadcn/ui

The generic controls are shadcn/ui components (Radix base, `radix-nova` style) in `src/components/ui/`. They are our files: edit them freely, they are not regenerated. `components.json` holds the CLI config (aliases `@/components`, `@/components/ui`, `@/lib/utils`; `tailwind.config` empty because Tailwind 4 is CSS-first; lucide icons).

**Adding a component.** Use the pinned CLI version (at least 7 days old; check with `npm view shadcn time --json`; currently 4.21.4) from `app/frontend/`:

```
bunx shadcn@4.21.4 add <component>
```

Then fix up what the generator writes, because it targets the default palette: (1) if it adds a `cn` package to `package.json` or imports `from "cn"`, run `bun remove cn` and import `cn` from `@/lib/utils`; (2) replace `bg-accent`, `bg-muted`, `text-accent-foreground`, `text-muted-foreground` with `bg-highlight-med`, `bg-highlight-low`, `text-text`, `text-meta` (see below); (3) remove `dark:` variants, `shadow-*` and `ring-*` utilities (focus is the global outline, borders are `border-rule-strong`); (4) use the radius utilities (`rounded-sm`) and the UI sans. If the CLI adds dependencies, check they went in through bun (7-day rule) and, if `init` or `add` rewrote `globals.css` or `layout.tsx`, discard those changes (it appends its own palette and a Geist font).

**How the variables map.** `tokens.css` defines shadcn's variables on `:root` from our roles, and registers the Tailwind colours for them: `--foreground` and `--popover-foreground` are `text`, `--primary` is `text` (with `--primary-foreground` `background`), `--secondary` is `highlight-low`, `--popover` is `overlay`, `--card` is `background`, `--muted-foreground` is `meta`, `--border` is `highlight-med` (the rule), `--input` is `highlight-high` (rule-strong), `--ring` is `accent`, `--destructive` is `error`, `--radius` is 3px. Our `accent` and `muted` roles keep their meaning, so shadcn's hover fill and quiet fill are written in the components as `bg-highlight-med` and `bg-highlight-low`. There is no `.dark` class: the `dark:` variant is declared but never matches, and each of the ten palettes sets the roles, so every component follows the theme. `--shadow-*` are `none`. Charts, tiles and prose do not use shadcn.

**Where each is used.** `Button`: Widget controls, Prev/Next in the Step-through Game, "Show all", Add/Clear/Remove in the Candidate filter, the sort headings of the Opener table, the phone menu button, the theme button. `Input` and `Label`: `WordInput` and the State and "Rows to show" fields. `Select`: the Step-through Game's Strategy options (the arrow-key shortcut ignores keys inside a Select). `Table`: the Opener table, the Benchmark table, the Step-through Suggestions. `Tooltip`: `<Term>`. `DropdownMenu`: the theme menu. `Collapsible`: the phone Article menu. `TooltipProvider` wraps the page in `layout.tsx`.

## Design tokens

The look is a minimal editorial one: the text leads and chrome recedes. All non-colour tokens live in `app/tokens.css` (with the role-to-colour mapping, formerly in `globals.css`); the palettes stay in `themes.css`. Components use the Tailwind utilities the tokens generate and no raw sizes, fonts or colours.

- **Fonts** (`next/font/google` in `layout.tsx`, self-hosted at build, exposed as `--font-newsreader`, `--font-inter`, `--font-jetbrains-mono` and mapped to `font-serif`, `font-sans`, `font-mono`): Newsreader for prose, headings and the body default; Inter for UI (sidebar, Widgets, tables, eyebrow labels); JetBrains Mono for tiles, Feedback digits, words and numbers (tabular figures).
- **Type scale**: `text-xs` to `text-4xl`, each with a line-height (`--text-*--line-height`). `text-base` is the 18px prose size at 1.7 leading. `tracking-tight` for display sizes, `tracking-caps` for small uppercase labels.
- **Space**: Tailwind's scale for small gaps, plus `gutter` / `gutter-wide` (page padding), `flow` (between blocks), `figure` (around a Widget) and `section` (between sections), as `px-gutter`, `my-figure`, `space-y-section`.
- **Measure and page**: `max-w-measure` (68ch) for prose and text blocks, `max-w-page` (68rem) for the page, `--container-nav` for the sidebar column.
- **Rules**: `border-rule` (`highlight-med`) is the hairline for frames, dividers and the chart grid; `border-rule-strong` (`highlight-high`) for input borders and table heads. 1px (`--rule-width`).
- **Shape**: radius 1-3px (tiles keep 3px), `--shadow-*` are `none`.
- **Focus**: one global `:focus-visible` ring (2px `accent`, 2px offset); components do not restyle it.
- **Colour use**: `text` and `background` carry the page (headings are `text`, not `heading`: `heading` and `accent` fall under 3:1 on `background` in Rosé Pine Dawn and Catppuccin Latte); `accent` is only link underlines, the Term underline and focus. Small metadata uses the derived `text-meta` (`subtle` mixed 45% toward `text`, so it stays above about 4.5:1 in every palette); plain `subtle` is for placeholders and `muted` only for decoration. `surface` is used only behind the video embed and `overlay` for tooltips.
- **Shared utilities** (in `tokens.css`): `link`, `eyebrow` (small uppercase UI label). Inputs, selects, buttons and tables are the shadcn components (see "shadcn/ui"). A Widget is `WidgetFrame` in `widgets/ui.tsx`: hairline rules above and below and an `eyebrow` title, no fill. Charts use `CHART_CLASS` (UI sans, `text-meta`, tooltip variables) and `CHART_THEME` (grid in `highlight-med`).
- **Prose** (`prose-theme` in `globals.css`) takes fonts, sizes and colours from the tokens; its rules skip `not-prose` blocks (Widgets). KaTeX is sized at 1.08em and long display maths scrolls inside itself.

## Series and Articles

Content lives in `content/`, outside `src/`. The site has exactly one Series, "Solving Wordle" (`content/series.mdx`), and every Article belongs to it. Every page is statically generated (`generateStaticParams`, `dynamicParams = false`), so an unknown URL is a 404.

**MDX pipeline.** `next.config.ts` wraps the config in `@next/mdx`. The remark and rehype plugins are named by string with serialisable options (`"remark-frontmatter"`, `"remark-math"`, `["rehype-katex", {...}]`), because Turbopack cannot be handed functions. `app/layout.tsx` imports `katex/dist/katex.min.css`. KaTeX is set to throw on bad maths, so a typo in a formula fails the build.

**Frontmatter.** `remark-frontmatter` only strips the `---` block from the rendered output. The data is read by `lib/content.ts` with gray-matter, straight from the files with `fs`. That gives the index, the backlinks and the validation one plain function over all files, with no need to compile and import every MDX file to read a few fields.

**Add or reorder an Article.** The file name is `NN-slug.mdx`: the two-digit prefix is the Article's number (and its place in the Series), the rest is its URL slug (`05-candidate-set.mdx` is `/articles/candidate-set`). Prerequisites use the slug without the prefix, so renumbering never breaks a link or a Prerequisite. To insert or move an Article, rename files so the numbers run 01..N again (`git mv`). There is no `order` field. Create `content/articles/NN-<slug>.mdx`:

```mdx
---
title: "Feedback Split"
summary: "One line shown in lists."
prerequisites: [candidate-set]   # slugs of other Articles, or []
part: solving-wordle             # id of a Part in series.mdx, required
video: "4:10"                    # optional: where it starts in the Series video ("m:ss", "h:mm:ss" or seconds)
---

Body in MDX. Inline maths $x^2$, display maths in `$$ ... $$`, and <Term>Feedback Split</Term>.
```

The Article page header shows its Part and number (`Part 2 · Solving Wordle · 05`), then its Prerequisites (from `prerequisites`), the Articles that list it as a Prerequisite ("Builds on this Article", the backlinks), and previous and next links across all Articles in number order.

**Sidebar** (`components/Sidebar.tsx`, rendered by `layout.tsx` on every page; there is no top header). Top to bottom: the site title (the Series title, a link home), the Articles grouped under their Part titles (`Part 1 · Wordle`, then number and title each), and the theme menu button. The current Article has `aria-current="page"` (found with `usePathname`, so it is a Client Component) and is styled `border-text font-medium text-text`. From the `lg` breakpoint (1024px) it is a column (the layout grid is `--container-nav` + the rest): `position: sticky`, full viewport height, the Article list scrolls inside it if long, and the theme button stays at the bottom. Below `lg` it is a compact top bar with the title, the theme button and an "Articles" button (a shadcn `CollapsibleTrigger`, which sets `aria-expanded` and `aria-controls`) that opens the list below the bar; it closes by itself after navigating. The `CollapsibleContent` is force-mounted and always shown from `lg`. It is one markup, so CSS only decides what is shown, and the page never scrolls sideways. `<main>` is `max-w-page` so Widgets have room; text blocks of the prose (paragraphs, lists, headings, quotes) are capped at the measure (68ch) while Widgets and display maths use the full column. The home page text stays at the measure.

**The Series** (`content/series.mdx`): frontmatter `title`, `intro`, `parts` and optional `video` (a YouTube id or URL), then optional MDX body text. The home page `/` is the Series page: the title, intro and video (if any), then each Part (number, title, intro) with its Articles in number order, each with its number, title and summary, plus a "Watch from m:ss" link when both the Series and the Article have a video time. There is no `/series/...` route.

**Parts.** `parts` is an ordered list of `{id, title, intro}`. The Series has two: `wordle` (Part 1, Articles 01-03: the game) and `solving-wordle` (Part 2, Articles 04-10: the road to the best Opener). Every Article names its Part's `id` in `part`, and the file numbers run through the whole Series, so a Part's Articles are consecutive.

**Numbering.** An Article's number is the `NN` of its file name (1 to 10), and `lib/parts.ts` `formatNumber` is the one formatter: always two digits with leading zeros (`01` ... `10`). It is shown in the sidebar, on the home page, in the Article header and in the previous/next links, always in `font-mono` with tabular figures.

**Video timestamps.** An Article's `video` is a start time in the Series' video. Only the Series page uses it, as a "Watch from m:ss" link to YouTube (`&t=<seconds>s`) beside each Article; the Article page itself shows no video. An Article without `video`, or a Series without one, has no link; none of the current content has a video yet (ticket 10).

**Build-time checks** (`lib/content.ts`; a failure stops `bun run build` with the file name in the message): unknown Prerequisite, an Article that is its own Prerequisite, a Prerequisite cycle, the file names (`parseArticleFiles`: not `NN-slug.mdx` with exactly two digits, a repeated number, a repeated slug, or numbers that are not exactly 01..N with no gaps), and missing or malformed frontmatter. Parts (`lib/parts.ts` `validateParts`): an Article without `part` (`frontmatter "part" is missing`), an unknown Part (`unknown Part "x". Known Parts: ...`), a Part with no Articles (named against `content/series.mdx`), a Part whose Articles are not consecutive in number (names the Article of another Part between them), and a Part id used twice.

**The content.** The ten Articles follow the spec's outline. Prerequisites form a chain, with extra edges where an idea depends on an earlier one.

| No. | Slug (file `NN-slug.mdx`) | Part | Prerequisites | Body |
| --- | --- | --- | --- | --- |
| 01 | `rules` | 1 | | stub |
| 02 | `feedback` | 1 | `rules` | Feedback scorer |
| 03 | `building-the-game` | 1 | `feedback` | stub |
| 04 | `solving-introduction` | 2 | `building-the-game` | stub |
| 05 | `candidate-set` | 2 | `solving-introduction`, `feedback` | Candidate filter |
| 06 | `feedback-split` | 2 | `candidate-set` | Split explorer, without then with bits (Feedback Split and Expected Information) |
| 07 | `openers` | 2 | `feedback-split` | Opener table |
| 08 | `greedy-strategy` | 2 | `openers`, `candidate-set` | Step-through Game |
| 09 | `benchmark` | 2 | `greedy-strategy` | Benchmark chart |
| 10 | `greedy-vs-optimal` | 2 | `benchmark` | stub |

Articles with a stub body carry `{/* TODO(ticket 10): draft */}`; ticket 10 writes the full text.

## `<Term>`

`<Term>Candidate Set</Term>` works in any MDX file with no import (`src/mdx-components.tsx`). It looks the term up, case-insensitively, in the repo's root `GLOSSARY.md`, which `lib/glossary.ts` parses at build time: a `**Term**:` line, then its definition lines up to the blank line, ignoring `_Avoid_:` lines. It renders underlined text with the definition in a shadcn `Tooltip` (`TermTip.tsx`, a Client Component; `Term` itself stays a Server Component that reads the glossary) on hover, on keyboard focus (`tabIndex=0`) and on tap (a tap toggles it; Radix alone does not open on touch); Radix adds `role="tooltip"` and `aria-describedby` while it is open, and Escape or a tap elsewhere closes it. When the shown text differs from the term, name the term: `<Term of="Candidate">candidates</Term>`.

A term that is not in the glossary throws while the page is prerendered, so `bun run build` fails with `<Term>: "..." is not defined in GLOSSARY.md`. In `next dev` the error shows on that page.

## `<Mark>`

`<Mark kind="correct" />` (also `present`, `absent`) works in any MDX file with no import. It renders the Mark's name, or its children (`<Mark kind="present">Present letters</Mark>`), as a small inline label: JetBrains Mono, `text-xs` semibold caps with `tracking-caps`, tile radius (`rounded-md`), `px-1.5`, `leading-none` so it does not grow the prose line, on `bg-correct` / `bg-present` / `bg-absent`. It is a label, not a button (no hover fill, `cursor-help` only). On hover, keyboard focus and tap it shows that Mark's definition through the same `TermTip` as `<Term>` (`Mark.tsx` passes its own trigger classes). `lib/glossary.ts` `parseMarkKinds` splits the Mark entry of `GLOSSARY.md` into one definition per kind: the parenthetical after each bolded `**Correct** (...)`, `**Present** (...)`, `**Absent** (...)`; a missing one, or an unknown `kind`, throws and fails the build (`<Mark>: unknown kind "green"...`). Tests: `lib/glossary.test.ts`.

**Contrast.** The palettes' `on-*` roles are tuned for big tile letters. Against their Mark colour, small text reaches 4.5:1 in only 15 of 30 cases (correct, present, absent; worst: Nord absent 1.96, Rosé Pine Dawn present 2.05, Tokyo Night absent 2.17). So the label text is not `on-*`: tokens.css derives `ink-correct`, `ink-present`, `ink-absent` (`text-ink-*`), black or white by the lightness of the Mark colour (relative colour, threshold OKLCH L 0.6). The better of black and white is always at least about 4.5:1; across the ten palettes the lowest is 4.51 (Flexoki Light correct), most are above 6. The palettes are untouched. Tiles still use `on-*`.

## Maths

Write `$inline$` and `$$display$$` (remark-math, rendered by rehype-katex). Prose is styled by `@tailwindcss/typography` as `prose prose-theme`, where `prose-theme` (in `globals.css`) sets the typography from the design tokens.

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

Shows five tiles, then the two passes worked out for that pair (Correct first; then left to right, a letter is Present while the Answer still has an unused copy, otherwise Absent), as in [feedback-scoring.md](feedback-scoring.md). Example link: `/articles/feedback?fb.guess=eerie&fb.answer=crane`.

**Local and API.** The Marks and the explanation come from a TypeScript port (`lib/feedback.ts`), so they update at once and the explanation has its steps. After a short pause the Widget also calls `GET /api/feedback`: it is the authority on which words are on the Guess List (a 400 shows its message, e.g. `guess 'zzzzz' is not a valid five-letter word`) and a mismatch between its Marks and the port is reported. `lib/feedback.test.ts` checks the port against the repeated-letter examples of the scoring document, and against the running API when it is up (`BACKEND_URL`, default `http://127.0.0.1:8000`).

### Candidate filter

```mdx
<CandidateFilter id="cs" state="crane:00102,slate:01200" />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `state` | `state` (or `<id>.state`) | the State: rows `guess:feedback` joined by commas |
| `id` | | namespace for the param |

A row's feedback is five digits, 0 Absent, 1 Present, 2 Correct (`crane:00102`); a row without `:feedback` starts all Absent; malformed rows are dropped; at most six rows. In the Widget the reader types each Guess and clicks its tiles to cycle the Marks (Absent, Present, Correct). Every complete row shows its Candidate Set count before and after (`2309 → 49`), and below are the final count and the words (the first 48, with a button for all). It makes one `POST /api/candidates` per prefix of the State (Guess 0, 1, ..., n), so an invalid Guess or Feedback shows the API's message on its row; incomplete rows are ignored until they have five letters. Example link: `/articles/candidate-set?cs.state=crane:20000`.

### Feedback Split explorer

```mdx
<SplitExplorer id="fs" guess="crane" state="slate:01200" bits={false} />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `guess` | `guess` (or `<id>.guess`) | the Guess to split on |
| `state` | `state` (or `<id>.state`) | optional State, `guess:feedback` rows joined by commas; the Candidate Set it leaves is what is split (default: the whole Answer List) |
| `bits` | | default `true`; `bits={false}` hides Expected Information (Article 06 shows the Split without it first, then adds it) |
| `id` | | namespace for the params |

One `POST /api/split` (after a short pause) gives the groups, shown as a bar chart (one bar per Feedback, height = words in the group, x labelled with the Feedback digits) with Expected Candidates, the Candidate count, the group count and largest group, and Expected Information in bits unless hidden. A Guess can have up to about 150 groups, so the chart draws the 30 largest (`CHART_BARS`) and a scrollable list below holds every group, each with its tiles, Feedback and word count. Clicking a bar, or a list row (a button with `aria-pressed`), selects that group and lists its words (the first 60, with a button for all). An invalid Guess or State shows the API's message. Example link: `/articles/feedback-split?ei.guess=crane&ei.state=slate:01200`.

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

The defaults are the main Strategy: Expected Information over all Guesses. One `GET /api/solve` returns the whole Game; the Widget then shows tiles for each Guess so far, Prev and Next buttons (and the Left and Right arrow keys while focus is inside the Widget, outside its inputs), "Guess n of N", the Candidate Set size before and after the Guess, and a table of the Solver's top five Suggestions at that step with their bits, Expected Candidates and whether each is a Candidate (the first row is the Guess played). Example link: `/articles/greedy-strategy?g.answer=watch&g.step=3`.

### Opener table and Benchmark chart (Widgets 5 and 6)

Both load their data once with the `useLoad` hook (`GET /api/openers`, `GET /api/benchmark`); a 503 from a backend that was not precomputed shows its message (including "Run `just backend-precompute` first.") as the error.

**Opener table** (`OpenerTable`). Props: `top` (default 20, 1 to 500), `highlight` (comma separated words, e.g. `"crane,slate"`), `id`. URL params `top`, `highlight` (`op.top` with `id="op"`) override the props. A table of rank, Opener, bits, Expected Candidates, groups, largest group and Candidate?. Every heading is a button that sorts by that column (click again to reverse; `aria-sort` is set). Highlighted words are emphasised and listed even when they rank below `top`; when `highlight` is set the Widget fetches all 500 rows. The table scrolls horizontally inside its card at phone width. A "Rows to show" input edits `top`.

**Benchmark chart** (`BenchmarkChart`). Props: `strategies` (comma separated ids from `bits-all`, `bits-candidates`, `expected-all`; default all three; unknown ids are dropped, none valid means all), `id`. URL param `strategies` (`bm.strategies`) overrides it. The chart is grouped bars (`barY` with `layout: group()`, `z` = Strategy): x is the Guess Count 1 to 6 plus a final "Lost" group for the Losses, so Losses are on the chart and not folded into the distribution; y is Games. Each Strategy has a fixed theme-role colour by its position in the API list (`--accent`, `--present`, `--correct`, `--error`), so it keeps its colour when a subset is shown. Below the chart a table gives each Strategy's Opener, Average Guess Count, Losses (red when above zero), and the exact Guess Distribution, then the lost Answers of each Strategy. Example link: `/articles/benchmark?bm.strategies=bits-all,expected-all`.

### Charts

Charts use TanStack Charts: `@tanstack/react-charts` 1.1.0, which re-exports the `<Chart>` of its dependency `@tanstack/charts` (read `node_modules/@tanstack/charts/docs/` and `llms.txt`; it is not the old `react-charts` v3). A chart is a memoised `defineChart({ marks, scales, tooltip })` (marks such as `barY`, compact `scaleBand`/`scaleLinear` from `@tanstack/charts/scales/*`, the `tooltip` extension) passed to `<Chart definition height ariaLabel onSelect />`. `components/widgets/GroupChart.tsx` and `BenchmarkChart.tsx` are the charts; both use the shared `CHART_CLASS` wrapper from `ui.tsx`.

- **Theme roles.** Mark paints are CSS variables (`fill: "var(--accent)"`, the selected bar `var(--heading)`), so a theme change repaints with no rebuild; the axes, grid and labels use `currentColor`, set by a `text-subtle` wrapper; the tooltip colours are set from `--overlay` and `--text` through the library's `--ts-chart-tooltip-*` variables. Charts never use fixed colours.
- **SSR.** `<Chart>` server-renders SVG at `initialWidth` and then measures its container after hydration. The Widgets only mount a chart once the API data has arrived on the client, so no chart markup is rendered on the server and there is nothing to mismatch; a definition must not read `window` or other client-only values if a future chart is rendered on the server.
- **Interaction.** The chart is keyboard focusable (arrow keys move between bars, Enter selects); the same selection is available from the list below, which also gives the exact values as text.

All Widgets show loading and error states (`role="alert"` for errors, `aria-live` for results), use real labelled inputs and buttons so they work from the keyboard, and wrap at phone width.
