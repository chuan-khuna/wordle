# Site sidebar: title and theme picker move into the side nav

Status: done
Blocked by: 13

Remove the top site header. The side nav from ticket 12 becomes a site-wide sidebar on every page (the home page and Article pages): the site title (linking home) at the top, then the Series' Articles, then the theme picker at the bottom. On an Article page the current Article is marked, as now. On wide screens it is a sticky column; at phone width it collapses into a compact top bar with the title and a disclosure that opens the navigation and the theme picker, with no horizontal page scroll. Use the design tokens from ticket 13. Update `docs/documents/web-frontend.md`.

See [spec](../spec.md).

## One Series

The site has exactly one Series ("Solving Wordle"); see the updated spec. In the same change:

- The home page becomes the Series page (title, intro, video, Articles in `order`). Remove the `/series/[slug]` route and the index's list of Series.
- Move the Series to a single `content/series.mdx`. Drop the Articles' `series` frontmatter field and the code that validates or groups by Series; keep `order` (unique, validated).
- The sidebar lists the Series' Articles on every page, with the current Article marked on Article pages.

## Comments

Done. One Series in `content/series.mdx`; `/` is the Series page; `/series/[slug]` and the Series grouping are gone. `Sidebar` (client, `usePathname` for `aria-current`) replaces the header and `SeriesNav`: sticky full-height column from `lg`, top bar with an Articles button below. Added `src/mdx.d.ts` so `@content/series.mdx` type-checks. Checked at 1280px and 390px in Rose Pine Dawn and Rose Pine: no horizontal scroll.
