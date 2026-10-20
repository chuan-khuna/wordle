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
    components/widgets/     the Widgets: FeedbackScorer, CandidateFilter, SplitExplorer (with SplitChart), StepThroughGame, OpenerTable, BenchmarkChart, and their parts: WordRow, StateBoard, useGuessCheck, Tile, ui, useWidgetParam, useLoad
    lib/feedback.ts         TypeScript port of the Feedback scorer, with its step trace (feedback.test.ts)
    lib/widget-state.ts     the `guess:feedback,...` State text format
    lib/state-board.ts      the pure logic of the State input: typing, Backspace pull-back, Mark cycling, Win, six-row cap (state-board.test.ts)
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

**The theme menu** (`ThemePicker.tsx`): a shadcn `DropdownMenu` opened by an icon `Button` (lucide `Palette`, `aria-label="Theme"`). Its content is one `DropdownMenuRadioGroup`: "System", then the Light palettes under a "Light" label, then the Dark ones under "Dark"; the current choice is checked. Choosing an item runs the same save-and-dispatch as before (System removes the `localStorage` key). It sits at the top of the sidebar, beside the site title; on phones that row is the top bar, where it sits next to the Articles button, so it is reachable without opening the menu.

## shadcn/ui

The generic controls are shadcn/ui components (Radix base, `radix-nova` style) in `src/components/ui/`. They are our files: edit them freely, they are not regenerated. `components.json` holds the CLI config (aliases `@/components`, `@/components/ui`, `@/lib/utils`; `tailwind.config` empty because Tailwind 4 is CSS-first; lucide icons).

**Adding a component.** Use the pinned CLI version (at least 7 days old; check with `npm view shadcn time --json`; currently 4.21.4) from `app/frontend/`:

```
bunx shadcn@4.21.4 add <component>
```

Then fix up what the generator writes, because it targets the default palette: (1) if it adds a `cn` package to `package.json` or imports `from "cn"`, run `bun remove cn` and import `cn` from `@/lib/utils`; (2) replace `bg-accent`, `bg-muted`, `text-accent-foreground`, `text-muted-foreground` with `bg-highlight-med`, `bg-highlight-low`, `text-text`, `text-meta` (see below); (3) remove `dark:` variants, `shadow-*` and `ring-*` utilities (focus is the global outline, borders are `border-rule-strong`); (4) use the radius utilities (`rounded-sm`) and the UI sans. If the CLI adds dependencies, check they went in through bun (7-day rule) and, if `init` or `add` rewrote `globals.css` or `layout.tsx`, discard those changes (it appends its own palette and a Geist font).

**How the variables map.** `tokens.css` defines shadcn's variables on `:root` from our roles, and registers the Tailwind colours for them: `--foreground` and `--popover-foreground` are `text`, `--primary` is `text` (with `--primary-foreground` `background`), `--secondary` is `highlight-low`, `--popover` is `overlay`, `--card` is `background`, `--muted-foreground` is `meta`, `--border` is `highlight-med` (the rule), `--input` is `highlight-high` (rule-strong), `--ring` is `accent`, `--destructive` is `error`, `--radius` is 3px. Our `accent` and `muted` roles keep their meaning, so shadcn's hover fill and quiet fill are written in the components as `bg-highlight-med` and `bg-highlight-low`. There is no `.dark` class: the `dark:` variant is declared but never matches, and each of the ten palettes sets the roles, so every component follows the theme. `--shadow-*` are `none`. Charts, tiles and prose do not use shadcn.

**Where each is used.** `Button`: Widget controls, Prev/Next in the Step-through Game, "Start over" in the State input, the sort headings of the Opener table, the phone menu button, the theme button. `Label`: the labels of `WordRow`. `Input`: the Opener table's "Rows to show" field (the word and State fields are `WordRow` and `StateBoard`, below). `Select`: the Step-through Game's Strategy options (the arrow-key shortcut ignores keys inside a Select). `Table`: the Opener table, the Benchmark table, the Step-through Suggestions. `Tooltip`: `<Term>`. `DropdownMenu`: the theme menu. `Collapsible`: the phone Article menu. `TooltipProvider` wraps the page in `layout.tsx`.

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

**Sidebar** (`components/Sidebar.tsx`, rendered by `layout.tsx` on every page; there is no top header). Top to bottom: the site title (the Series title, a link home) with the theme menu button beside it, then the Articles grouped under their Part titles (`Part 1 · Wordle`, then number and title each). The current Article has `aria-current="page"` (found with `usePathname`, so it is a Client Component) and is styled `border-text font-medium text-text`. From the `lg` breakpoint (1024px) it is a column (the layout grid is `--container-nav` + the rest): `position: sticky`, full viewport height, and the Article list scrolls inside it if long. Below `lg` it is a compact top bar with the title, the theme button and an "Articles" button (a shadcn `CollapsibleTrigger`, which sets `aria-expanded` and `aria-controls`) that opens the list below the bar; it closes by itself after navigating. The `CollapsibleContent` is force-mounted and always shown from `lg`. It is one markup, so CSS only decides what is shown, and the page never scrolls sideways. `<main>` is `max-w-page` so Widgets have room; text blocks of the prose (paragraphs, lists, headings, quotes) and code blocks are capped at the measure (68ch) while Widgets and display maths use the full column. The home page text stays at the measure.

**The Series** (`content/series.mdx`): frontmatter `title`, `intro`, `parts` and optional `video` (a YouTube id or URL), then optional MDX body text. The home page `/` is the Series page: the title, intro and video (if any), then each Part (number, title, intro) with its Articles in number order, each with its number, title and summary, plus a "Watch from m:ss" link when both the Series and the Article have a video time. There is no `/series/...` route.

**Parts.** `parts` is an ordered list of `{id, title, intro}`. The Series has two: `wordle` (Part 1, Articles 01-03: the game) and `solving-wordle` (Part 2, Articles 04-10: the road to the best Opener). Every Article names its Part's `id` in `part`, and the file numbers run through the whole Series, so a Part's Articles are consecutive.

**Numbering.** An Article's number is the `NN` of its file name (1 to 10), and `lib/parts.ts` `formatNumber` is the one formatter: always two digits with leading zeros (`01` ... `10`). It is shown in the sidebar, on the home page, in the Article header and in the previous/next links, always in `font-mono` with tabular figures.

**Video timestamps.** An Article's `video` is a start time in the Series' video. Only the Series page uses it, as a "Watch from m:ss" link to YouTube (`&t=<seconds>s`) beside each Article; the Article page itself shows no video. An Article without `video`, or a Series without one, has no link; none of the current content has a video yet (ticket 10).

**Build-time checks** (`lib/content.ts`; a failure stops `bun run build` with the file name in the message): unknown Prerequisite, an Article that is its own Prerequisite, a Prerequisite cycle, the file names (`parseArticleFiles`: not `NN-slug.mdx` with exactly two digits, a repeated number, a repeated slug, or numbers that are not exactly 01..N with no gaps), and missing or malformed frontmatter. Parts (`lib/parts.ts` `validateParts`): an Article without `part` (`frontmatter "part" is missing`), an unknown Part (`unknown Part "x". Known Parts: ...`), a Part with no Articles (named against `content/series.mdx`), a Part whose Articles are not consecutive in number (names the Article of another Part between them), and a Part id used twice.

**The content.** The ten Articles follow the spec's outline. Prerequisites form a chain, with extra edges where an idea depends on an earlier one.

| No. | Slug (file `NN-slug.mdx`) | Part | Prerequisites | Body |
| --- | --- | --- | --- | --- |
| 01 | `rules` | 1 | | text, `words.py` excerpt (no Widget) |
| 02 | `feedback` | 1 | `rules` | Feedback scorer |
| 03 | `building-the-game` | 1 | `feedback` | text, `game.py` excerpts and the game loop (no Widget) |
| 04 | `solving-introduction` | 2 | `building-the-game` | text and the maths (Expected Candidates, Expected Information in KaTeX), no Widget |
| 05 | `candidate-set` | 2 | `solving-introduction`, `feedback` | Candidate filter |
| 06 | `feedback-split` | 2 | `candidate-set` | Split explorer (`crane`, whole Answer List), Feedback Split then Expected Information |
| 07 | `openers` | 2 | `feedback-split` | Opener table |
| 08 | `greedy-strategy` | 2 | `openers`, `candidate-set` | two Step-through Games on `watch`: Candidates only (the _ATCH trap), then all words |
| 09 | `benchmark` | 2 | `greedy-strategy` | Benchmark chart |
| 10 | `greedy-vs-optimal` | 2 | `benchmark` | text, cites Selby and Bertsimas & Paskov (no Widget) |

The text of all ten Articles is a first draft (ticket 10) for the user to edit. Every number in it comes from the repo's code or the API, logged when it was written; Article 10's optimum is cited from Alex Selby's write-up.

## `<Term>`

`<Term>Candidate Set</Term>` works in any MDX file with no import (`src/mdx-components.tsx`). It looks the term up, case-insensitively, in the repo's root `GLOSSARY.md`, which `lib/glossary.ts` parses at build time: a `**Term**:` line, then its definition lines up to the blank line, ignoring `_Avoid_:` lines. It renders underlined text with the definition in a shadcn `Tooltip` (`TermTip.tsx`, a Client Component; `Term` itself stays a Server Component that reads the glossary) on hover, on keyboard focus (`tabIndex=0`) and on tap (a tap toggles it; Radix alone does not open on touch); Radix adds `role="tooltip"` and `aria-describedby` while it is open, and Escape or a tap elsewhere closes it. When the shown text differs from the term, name the term: `<Term of="Candidate">candidates</Term>`.

A term that is not in the glossary throws while the page is prerendered, so `bun run build` fails with `<Term>: "..." is not defined in GLOSSARY.md`. In `next dev` the error shows on that page.

## `<Mark>`

`<Mark kind="correct" />` (also `present`, `absent`) works in any MDX file with no import. It renders the Mark's name, or its children (`<Mark kind="present">Present letters</Mark>`), as a small inline label: JetBrains Mono, `text-xs` semibold caps with `tracking-caps`, tile radius (`rounded-md`), `px-1.5`, `leading-none` so it does not grow the prose line, on `bg-correct` / `bg-present` / `bg-absent`. It is a label, not a button (no hover fill, `cursor-help` only). On hover, keyboard focus and tap it shows that Mark's definition through the same `TermTip` as `<Term>` (`Mark.tsx` passes its own trigger classes). `lib/glossary.ts` `parseMarkKinds` splits the Mark entry of `GLOSSARY.md` into one definition per kind: the parenthetical after each bolded `**Correct** (...)`, `**Present** (...)`, `**Absent** (...)`; a missing one, or an unknown `kind`, throws and fails the build (`<Mark>: unknown kind "green"...`). Tests: `lib/glossary.test.ts`.

**Contrast.** The palettes' `on-*` roles are tuned for big tile letters. Against their Mark colour, small text reaches 4.5:1 in only 15 of 30 cases (correct, present, absent; worst: Nord absent 1.96, Rosé Pine Dawn present 2.05, Tokyo Night absent 2.17). So the label text is not `on-*`: tokens.css derives `ink-correct`, `ink-present`, `ink-absent` (`text-ink-*`), black or white by the lightness of the Mark colour (relative colour, threshold OKLCH L 0.6). The better of black and white is always at least about 4.5:1; across the ten palettes the lowest is 4.51 (Flexoki Light correct), most are above 6. The palettes are untouched. Tiles still use `on-*`.

## `<Word>`

`<Word>speed</Word>` works in any MDX file with no import. It draws the word as five small letter tiles inline in the prose (JetBrains Mono caps, tile radius, sized in `em` so it does not grow the line), with a quiet hairline `rule` frame (the divider colour). The tile styles live in `components/letter-tile.ts`, shared with `<Letter>`. `<Word feedback="00101">speed</Word>` paints each tile with its Mark (digits 0 Absent, 1 Present, 2 Correct), and `<Word answer="abide">speed</Word>` works that Feedback out with `lib/feedback.ts`. Painted tiles use the same `bg-*` and `text-ink-*` pair as `<Mark>`, for contrast. Screen readers get one `role="img"` label: the word, then each letter's Mark when there is Feedback ("SPEED: S Absent, P Absent, E Present, …"). The word (and `answer`) must be on the Guess List, read at build time from `packages/wordle/src/wordle/data/guesses.txt` by `lib/words.ts`; an unknown word, malformed `feedback`, or both `feedback` and `answer` throws and fails the build.

## `<Letter>`

`<Letter>e</Letter>` works in any MDX file with no import: one letter drawn as the same small tile as a letter of `<Word>` (plain, with the `rule` frame). `<Letter mark="present">e</Letter>` paints it with that Mark; `mark` takes the names `<Mark kind>` takes (`correct`, `present`, `absent`). Screen readers get "E" or "E, Present". Anything but one letter a to z, or an unknown `mark`, throws and fails the build.

## Code blocks

Fenced code in any MDX file is highlighted at build time by `rehype-pretty-code` + Shiki (no highlighter JS reaches the browser; the built HTML has the coloured spans). Write the language, then optional meta:

````
```python title="Two-pass Feedback" {64-69}
...
```
````

- `title="..."` adds a caption row naming the idea the code shows (for example "Two-pass Feedback"), not a file path: the code is there to explain the idea; `{3-5,9}` highlights lines (quiet fill plus an `accent` left rule); every block shows CSS-counter line numbers (`meta` colour, `user-select: none`, so they are not copied); `showLineNumbers` is accepted but no longer needed. No language means plain text. Inline `code` keeps its small `highlight-low` chip.
- **Block style** (`globals.css`, under `prose-theme`): `<figure data-rehype-pretty-code-figure>` with a hairline `border-rule` frame, `highlight-low` fill, `rounded-sm`, no shadow, `font-mono` `text-sm`. Long lines scroll inside the `<pre>` (`overflow-x: auto`), never the page.
- **Copy button**: `mdx-components.tsx` maps `figure` to `CodeFigure.tsx` (a small Client Component) for highlighted figures only: a shadcn `Button` (`ghost`, `icon-xs`, `Copy` then `Check` for 2s, `aria-label="Copy code"`, plus an `sr-only` `role="status"` "Code copied"). It copies the code element's text.
- **Turbopack**: the plugin is named by string in `next.config.ts` and its options are plain JSON. The Shiki theme is a VS Code-format object (`tokenColors`; rehype-pretty-code only takes an inline theme in that shape) whose colours are `var(--code-*)`, so no function (`createCssVariablesTheme`) is needed.
- **Token roles**, defined once in `globals.css` (`--code-*`), each coloured role mixed toward `text` so it stays readable on `highlight-low` in all ten palettes (lowest about 4.1:1 in Catppuccin Latte; most above 5): keywords/storage `accent` 40%; strings `success` 40%; numbers and constants (`True`, `None`) `present` 30%; function names and decorators `heading` 40%; types and classes `error` 40%; comments (italic) and punctuation/operators `meta`; everything else `text`. They follow the theme picker live because they are CSS variables.

## Maths

Write `$inline$` and `$$display$$` (remark-math, rendered by rehype-katex). Prose is styled by `@tailwindcss/typography` as `prose prose-theme`, where `prose-theme` (in `globals.css`) sets the typography from the design tokens.

## Widgets

Interactive figures, registered in `mdx-components.tsx` (no import needed). They are Client Components wrapped in `<Suspense>` (they read the URL with `useSearchParams`, which a static page needs). Tiles use the theme roles (`bg-correct text-on-correct` and so on); Marks are also in each tile's `aria-label`, so colour is never the only cue.

**Starting state and URL params.** A Widget starts from its MDX props. A URL query param of the same meaning overrides the prop, so a video take can be reproduced from a link. Edits are written back to the URL with `history.replaceState` (the param is removed again when it equals the prop), so the address bar is always a link to the current take. Params are read once, when the Widget mounts.

**Two Widgets in one Article.** Give each an `id`; its params are then named `<id>.<name>` (`fb.guess`, `cs.state`). Without an `id` the plain names are used (`guess`, `answer`, `state`), so two Widgets of the same kind without ids would share state.

### Word and State inputs

Every Guess, Answer and State in the Widgets is typed Wordle-style, with two shared parts.

**`WordRow`** (`widgets/WordRow.tsx`): a word as a row of five tiles. Props: `id`, `label`, `hideLabel`, `value` (letters only, at most five), `onChange(word)`, `onEnter(word)` (Enter with five letters), `onBackspaceEmpty()` (Backspace with nothing typed), `keepFocus` (don't put the phone keyboard away on Enter), `error` (a message, or null), `hint`. It is one focusable control: a visually hidden `<input>` (`sr-only`, `maxLength=5`, `inputMode="text"`, `enterKeyHint="done"`, `autoCapitalize="none"`, `autoComplete="off"`, `autoCorrect="off"`, `spellCheck={false}`, `text-base` so iOS does not zoom) labelled by a `<Label>` drives five `aria-hidden` tiles. Screen readers get the label and the input's value. Pressing the tiles focuses the input (so a tap opens the phone keyboard). Letters fill left to right, anything else is dropped (`cleanWord`), Backspace removes the last, and arrow keys, Home and End are ignored (and the selection is kept at the end, e.g. after Ctrl-A on a Mac), because the tiles have no movable caret. The next tile to fill shows a blinking caret (a pulse, off with `prefers-reduced-motion`) and the focus outline while the row has focus. Enter with five letters calls `onEnter` and, unless `keepFocus`, blurs the input (keyboard away); with fewer it says "Type all five letters." and shakes. `error` turns the tiles red, sets `aria-invalid` and `aria-describedby`, shows the message below (`role="alert"`) and shakes the row once whenever a message appears (the `animate-shake` utility in `tokens.css`, only under `prefers-reduced-motion: no-preference`; the message and the red border carry it otherwise).

**Checking a word.** `useGuessCheck(word)` asks the API whether a five-letter word is on the Guess List, 200ms after the fifth letter (so typing and deleting do not make a request per key), and returns `{ checking, error }`. The question is `GET /api/feedback?guess=w&answer=w` (`checkGuess` in `lib/api.ts`): a word that is not on the Guess List gets a 400 with the message, which `error` carries ("guess 'zzzzz' is not a valid five-letter word"). No new endpoint is needed. The Answer of the Step-through Game is checked by the `GET /api/solve` it already makes, which refuses a word that is not on the Answer List ("answer 'aahed' is not on the Answer List"); its message goes to the row. The Feedback scorer still scores locally at once, so its Marks show as soon as there are ten letters; only the API's word check and its cross-check wait.

**`StateBoard`** (`widgets/StateBoard.tsx`): a State like the gpui app's Solver mode. Props: `rows` (the State), `onChange(rows)`, `label`, `renderRowEnd(row, i)` (something beside each row). It is controlled by the parent, which keeps the rows in a URL param; the Guess being typed is its own. Rows of `Tile`s, then a `WordRow` for the next Guess:

- type a Guess and press Enter: the API checks it is on the Guess List (a refusal shows under the row and shakes it), and the row joins the State with every tile Absent;
- click or tap a tile, or press Space or Enter on a focused one, to move it Absent, then Present, then Correct, then Absent (each tile is a button named like "S, Present"); typing a letter or Backspace while a tile has focus goes to the typing row, so keyboard focus is never trapped;
- Backspace with nothing typed takes the last Guess back into the typing row (its Marks are cleared, as in the gpui app);
- up to six Guesses; a row that is all Correct is a Win ("Every tile is Correct: that Guess is a Win..."), and the typing row goes away; at six Guesses it says so;
- "Start over" (a shadcn `Button`) clears the State.

The logic is pure and tested in `lib/state-board.ts` (`typeLetter`, `backspace`, `enterGuess`, `cycleMark`, `isWin`, `canType`, `rowsFromState`, `startOver` on a `{ rows, typed }` board; `state-board.test.ts`). `rowsFromState` reads the `guess:feedback,...` text and keeps only five-letter rows, so a partial word in an old link is dropped.

**Keyboard.** Tab reaches each tile button and the typing row's input in turn, and every other control; nothing traps focus. The Step-through Game's Left and Right keys ignore any key pressed in an `<input>`, which includes every `WordRow`.

### Feedback scorer

```mdx
<FeedbackScorer id="fb" guess="speed" answer="abide" />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `guess`, `answer` | `guess`, `answer` (or `<id>.guess`, `<id>.answer`) | starting words, letters only |
| `id` | | namespace for the params |

Guess and Answer are `WordRow`s. Shows five tiles, then the two passes worked out for that pair (Correct first; then left to right, a letter is Present while the Answer still has an unused copy, otherwise Absent), as in [feedback-scoring.md](feedback-scoring.md). Example link: `/articles/feedback?fb.guess=eerie&fb.answer=crane`.

**Local and API.** The Marks and the explanation come from a TypeScript port (`lib/feedback.ts`), so they update at once and the explanation has its steps. After a short pause the Widget also calls `GET /api/feedback`: it is the authority on which words are on the Guess List (a 400 shows its message under the word's row, e.g. `guess 'zzzzz' is not a valid five-letter word`, and the row shakes) and a mismatch between its Marks and the port is reported. `lib/feedback.test.ts` checks the port against the repeated-letter examples of the scoring document, and against the running API when it is up (`BACKEND_URL`, default `http://127.0.0.1:8000`).

### Candidate filter

```mdx
<CandidateFilter id="cs" state="crane:00102,slate:01200" />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `state` | `state` (or `<id>.state`) | the State: rows `guess:feedback` joined by commas |
| `id` | | namespace for the param |

A row's feedback is five digits, 0 Absent, 1 Present, 2 Correct (`crane:00102`); a row without `:feedback` starts all Absent; malformed rows are dropped; at most six rows. In the Widget the reader builds the State in a `StateBoard`: types each Guess, presses Enter, and clicks its tiles to cycle the Marks (Absent, Present, Correct); Backspace takes the last Guess back. Every row shows its Candidate Set count before and after (`2309 → 49`), and below are the final count and every Candidate, in a mono grid that scrolls inside its box. It makes one `POST /api/candidates` per prefix of the State (Guess 0, 1, ..., n), so a bad row shows the API's message beside it; every row is a complete Guess, because the board only takes five-letter words (a partial word in the URL is dropped). Example link: `/articles/candidate-set?cs.state=crane:20000`.

### Feedback Split explorer

```mdx
<SplitExplorer id="fs" guess="crane" state="slate:01200" />
```

| Prop | URL param | Meaning |
| --- | --- | --- |
| `guess` | `guess` (or `<id>.guess`) | the Guess to split on |
| `state` | `state` (or `<id>.state`) | optional State, `guess:feedback` rows joined by commas; the Candidate Set it leaves is what is split (default: the whole Answer List) |
| `id` | | namespace for the params |

The Guess is a `WordRow` (checked against the Guess List) and the optional State a `StateBoard`; they sit above two columns. One `POST /api/split` (after a short pause) gives the groups. Layout: a container query on the Widget (`@container`, not the viewport, since the Article column is narrower than the window): from `@2xl` (672px of Widget width) the columns sit side by side, `3fr` chart and `2fr` words, the same height (the chart column's, set by its `max-h-80` scroll box; the words column is absolutely filled into that height and scrolls inside); below it they stack, chart then words (the word grid capped at `max-h-64`), with no sideways scroll at 390px.

Left, `SplitChart.tsx`, the gpui app's Solver chart (plain elements and tokens, no chart library; see the Chart bullet in `gpui-app.md`). The title always reads "Expected 79 words left · 5.74 bits" (the Expected Candidates, one decimal below 10, none from 10, and this Guess's Expected Information), with "N Feedbacks over M Candidates" under it. Below, one row per Feedback, every group (up to about 150), biggest first with ties by lower Feedback Code, in a `max-h-80` (320px) box that scrolls. A row is a button (`aria-pressed`, name "Feedback 00102, 15 words") of three columns: the Feedback as five `Tile tiny` Marks (16px), a bar as long as the group relative to the largest (at least 3px; `bg-correct` for the Win bar `22222`, `bg-subtle` otherwise, `bg-heading` when selected), and the figures in mono tabular figures, "15 words · 30.6%" (the word "words" and the dot are hidden below `sm`). The chance is the group size over the Candidate Set size (below 0.1% it gets two decimals). A static hint under the box explains the digits.

Right, `SplitWords.tsx`: the selected Feedback as the Guess's five Marks (`Tile small`), "127 words left", the probability caption ("00001: 5.5% chance of this Feedback, leaving 127 words"), then the words in a compact mono grid (`auto-fill`, 6ch minimum) that scrolls inside the column and lists every word of the group. When a result arrives the largest group is selected, so the column is never empty; clicking another bar (or Enter or Space on it) selects it; clicking the selected bar leaves it selected. The pure helpers (`orderGroups`, `percent`, `chanceSentence`, `barPercent`, `chartTitle`) are in `lib/split-chart.ts`, tested in `split-chart.test.ts`. An invalid Guess or State shows the API's message. Example link: `/articles/feedback-split?fs.guess=crane&fs.state=slate:01200`.

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

Charts use TanStack Charts: `@tanstack/react-charts` 1.1.0, which re-exports the `<Chart>` of its dependency `@tanstack/charts` (read `node_modules/@tanstack/charts/docs/` and `llms.txt`; it is not the old `react-charts` v3). A chart is a memoised `defineChart({ marks, scales, tooltip })` (marks such as `barY`, compact `scaleBand`/`scaleLinear` from `@tanstack/charts/scales/*`, the `tooltip` extension) passed to `<Chart definition height ariaLabel onSelect />`. `components/widgets/BenchmarkChart.tsx` is the only TanStack chart (it uses the shared `CHART_CLASS` wrapper from `ui.tsx`); the Feedback Split chart is plain elements (see its Widget section) because TanStack's axis labels cannot be coloured tiles.

- **Theme roles.** Mark paints are CSS variables (`fill: "var(--accent)"`, the selected bar `var(--heading)`), so a theme change repaints with no rebuild; the axes, grid and labels use `currentColor`, set by a `text-subtle` wrapper; the tooltip colours are set from `--overlay` and `--text` through the library's `--ts-chart-tooltip-*` variables. Charts never use fixed colours.
- **SSR.** `<Chart>` server-renders SVG at `initialWidth` and then measures its container after hydration. The Widgets only mount a chart once the API data has arrived on the client, so no chart markup is rendered on the server and there is nothing to mismatch; a definition must not read `window` or other client-only values if a future chart is rendered on the server.
- **Interaction.** The chart is keyboard focusable (arrow keys move between bars, Enter selects); the same selection is available from the list below, which also gives the exact values as text.

All Widgets show loading and error states (`role="alert"` for errors, `aria-live` for results), use real labelled inputs and buttons so they work from the keyboard, and wrap at phone width.
