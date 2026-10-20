# Web frontend

The Next.js app behind the website, in `app/frontend/`. It is built with the App Router, TypeScript, Tailwind CSS v4 and bun. The website's plan is in `.scratch/website/spec.md`; the API it talks to is in [web-backend.md](web-backend.md).

## Layout

```
app/frontend/
  package.json, bun.lock    bun is the package manager (never npm)
  bunfig.toml               minimumReleaseAge = 604800 (7 days)
  .npmrc                    min-release-age=7
  next.config.ts            the /api rewrite to BACKEND_URL
  src/
    app/
      layout.tsx            <html>, the no-flash theme script in <head>
      page.tsx              the home page: theme picker, sample tiles and role swatches
      globals.css           Tailwind, and the CSS variables mapped to Tailwind colours
      themes.css            the ten palettes as CSS variables (generated from the gpui themes)
    components/ThemePicker.tsx
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
