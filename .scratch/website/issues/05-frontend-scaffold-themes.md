# Frontend scaffold, themes and API proxy

Status: done

Create `app/frontend/`: Next.js App Router, TypeScript, Tailwind and bun, with `bunfig.toml` and `.npmrc` set to the 7-day minimum release age. Add the `/api` rewrite to `BACKEND_URL`. Port the gpui app's ten themes (`app/wordle-gpui/src/theme/`) to CSS variables with the same role names. The default follows the system setting, and the picker's choice is saved in `localStorage` with no flash on load. Add `just frontend` and `just web`. Start `docs/documents/web-frontend.md` and add it to `INDEX.md`.

See [spec](../spec.md).

## Comments

Done. Next 16.4, React 19.3, Tailwind 4.3, TypeScript 6 (typescript-eslint does not support 7 yet). Themes are `[data-theme]` blocks in `src/app/themes.css`, mapped to Tailwind colours in `globals.css`; an inline `<head>` script avoids the flash. `just web` stops both servers on Ctrl-C. See `docs/documents/web-frontend.md`.
