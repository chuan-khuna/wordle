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
    mdx-components.tsx      components every MDX file can use without importing (<Term>)
    app/
      layout.tsx            <html>, the no-flash theme script, the site header with the theme picker, KaTeX CSS
      page.tsx              the index page: the Series and all Articles
      articles/[slug]/      an Article page
      series/[slug]/        a Series page
      globals.css           Tailwind, and the CSS variables mapped to Tailwind colours
      themes.css            the ten palettes as CSS variables (generated from the gpui themes)
    components/ThemePicker.tsx
    components/Term.tsx, VideoEmbed.tsx, ArticleList.tsx
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

**Add a Series.** Create `content/series/<slug>.mdx` with frontmatter `title`, `intro` and optional `video` (a YouTube id or URL), then optional MDX body text. The Series page embeds the video and lists its Articles in `order`.

**Video timestamps.** An Article's `video` is a start time in its Series' video. The Article page then shows an embed that starts there (`?start=<seconds>`) and an "Open it on YouTube" link (`&t=<seconds>s`), and the Series page links each Article's start time. An Article without `video`, or in a Series without one, shows nothing.

**Build-time checks** (`lib/content.ts`; a failure stops `bun run build` with the file name in the message): unknown Series, unknown Prerequisite, an Article that is its own Prerequisite, a Prerequisite cycle, two Articles with the same `order` in a Series, and missing or malformed frontmatter.

**Sample content.** `content/*/sample-*` is placeholder, written to exercise all of this. The real Series replaces it in a later ticket.

## `<Term>`

`<Term>Candidate Set</Term>` works in any MDX file with no import (`src/mdx-components.tsx`). It looks the term up, case-insensitively, in the repo's root `GLOSSARY.md`, which `lib/glossary.ts` parses at build time: a `**Term**:` line, then its definition lines up to the blank line, ignoring `_Avoid_:` lines. It renders underlined text with the definition as a tooltip on hover and on keyboard focus (`tabIndex=0`, `role="tooltip"`, `aria-describedby`). When the shown text differs from the term, name the term: `<Term of="Candidate">candidates</Term>`.

A term that is not in the glossary throws while the page is prerendered, so `bun run build` fails with `<Term>: "..." is not defined in GLOSSARY.md`. In `next dev` the error shows on that page.

## Maths

Write `$inline$` and `$$display$$` (remark-math, rendered by rehype-katex). Prose is styled by `@tailwindcss/typography` as `prose prose-theme`, where `prose-theme` (in `globals.css`) sets the typography colours from the theme roles.
