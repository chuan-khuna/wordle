# shadcn/ui components and an icon theme menu

Status: done
Blocked by: 16

Use shadcn/ui for the site's UI components, styled by our design tokens.

- Set up shadcn/ui in `app/frontend/` for Tailwind 4 and React 19 (`components.json`, `src/components/ui/`, `cn` helper, `lucide-react` icons). Run the CLI with an exact version at least 7 days old (`bunx shadcn@<version>`), and add its packages with `bun add` so the 7-day minimum release age applies.
- Map shadcn's CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, `--radius`, `--popover`, …) onto our theme roles and design tokens in `tokens.css`, so every component follows the ten palettes and the editorial style (small radius, hairline borders, no shadows). Do not change the palettes.
- **Theme selector**: replace the `<select>` with a shadcn DropdownMenu opened by an icon button (for example lucide `Palette`, with an accessible label such as "Theme"). The menu lists "System" and the ten palettes grouped Light and Dark, with the current one checked (radio items). It keeps the `localStorage` key, the "System" behaviour and the no-flash script.
- Replace hand-rolled controls with shadcn components where one fits: Button (Widget controls, prev/next in the Step-through Game, "Show all"), Input (word and State inputs), Select (Strategy options), Table (Opener table, Benchmark and Suggestion tables), Tooltip or HoverCard (`<Term>`), Collapsible or Sheet (the phone sidebar menu). Keep the tiles, charts and prose as they are. Keep every `aria-*` behaviour, keyboard support and URL param.
- Check light and dark at 1280px and 390px, including the theme menu open. Update `docs/documents/web-frontend.md` (shadcn setup, where components live, how tokens map, how to add one).

See [spec](../spec.md).

## Comments

- Done with shadcn CLI 4.21.4 (radix base, radix-nova style); packages added through `bun add`. The CLI's generated palette and Geist font were discarded; its variables map onto our roles in `tokens.css`. Details in `docs/documents/web-frontend.md` ("shadcn/ui").
- Replaced: theme `<select>` with a DropdownMenu radio group (icon button, `aria-label="Theme"`), the phone menu with Collapsible, `<Term>` with Tooltip (tap toggles), and the hand-rolled `btn`, `field` and `data-table` with Button, Input/Label, Select and Table. Those utilities are removed from `tokens.css`.
- Not changed: tiles, charts, prose, the Feedback Split group list rows (a list of toggle rows, not buttons in the control sense).
