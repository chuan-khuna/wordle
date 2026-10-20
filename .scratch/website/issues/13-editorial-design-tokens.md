# Editorial, minimal design tokens

Status: ready-for-agent
Blocked by: 12

Redesign the site's design tokens and apply them so the site reads like a minimal editorial publication: the text leads, and chrome recedes.

- **Keep** the ten theme palettes and their role names (the spec ties them to the gpui app and the picker). The redesign changes how the roles are used, not the palettes.
- **Type**: a serif for Article prose and headings, a quiet sans for UI (header, nav, Widget controls, tables), and a monospace for tiles, Feedback digits and numbers (tabular figures). Load the fonts with `next/font` (self-hosted at build). Define a type scale (size and line-height tokens), a comfortable measure for prose (about 65–70ch), and generous leading.
- **Space, rules and shape**: a spacing scale with generous vertical rhythm; hairline rules (`highlight-med` or similar) instead of filled cards; small or no radius; no shadows. Tiles stay coloured squares, since colour carries the meaning there.
- **Colour use**: `background` and `text` carry the page; `subtle`/`muted` for metadata; `accent` for links and focus only; `surface`/`overlay` only where a Widget really needs a panel. Widgets read as figures in the text: a hairline frame or rules above and below, and a small caption-style title.
- **Apply** the tokens across the site header, index, Series and Article pages (including the Series side nav from ticket 12), `prose-theme`, `<Term>` tooltips, the six Widgets, their tables and the TanStack charts (axes, grid and tooltip in the same type and colour roles).
- Tokens live as CSS variables in one place and map into Tailwind's `@theme`, so components use token names, not raw values.
- Check light and dark in at least three palettes, at about 1280px and 390px wide. Update `docs/documents/web-frontend.md` with a short Design tokens section.

See [spec](../spec.md).
