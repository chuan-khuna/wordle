# 02: Explore the chart: tooltip, Strategy, filter, highlights, phones

**What to build:** On `/openers` a reader can explore the Opener Distribution:
- Hover or tap any block to see the Opener's word, rank, Average Guess Count (3 decimals), Losses and whether it's on the Answer List.
- Switch between the four Strategies.
- Show only Answer List Openers (off by default on the page).
- Type words to highlight. Their blocks turn the accent colour and get a label.

The same settings work as Widget props and `id`-namespaced URL params, so an Article can fix them and hide the controls. On a phone the chart scrolls sideways inside its own frame, and the page never does. A partly built summary is charted with a note "N of 14,855 Openers played". A short intro paragraph sits above the chart on the page. See [the spec](../spec.md).

**Blocked by:** 01 (Opener Distribution tracer: endpoint to `/openers` page)

**Status:** ready-for-agent

- [x] The tooltip shows word, rank, Average Guess Count to 3 decimals, Losses and Answer List yes/no, on hover and on tap.
- [x] The Strategy picker fetches the chosen Strategy. The Answer List toggle filters on the client with no new request. The grouping tests are extended to cover the filter.
- [x] `highlight` (a comma list, or the word box on the page) draws those Openers in the accent colour with their words printed. Unknown words are ignored.
- [x] `strategy`, `answersOnly`, `highlight` and `controls` work as props and as URL params that override them, namespaced by `id` like the other Widgets.
- [x] When `complete_rows < total_rows`, the chart shows what there is, plus the "N of 14,855 Openers played" note.
- [x] At 360px wide, bars keep a minimum width and the chart frame scrolls sideways. The x axis is labelled every 0.05.
- [x] The `/openers` page has a short intro paragraph above the Widget.
- [x] `web-frontend.md` describes the props, URL params, tooltip and phone behaviour.

## Comments

**User request (added during implementation):** add an input to search for an Opener and show its stats.

- [x] A search input (part of `controls`) takes one Opener word. When the word is found, it shows a stat panel next to or below the chart: word, rank of total, Average Guess Count (3 decimals), Losses, Answer List yes/no, and which bar it falls in. Its block is highlighted in the accent colour and scrolled into view in the chart frame. An unknown word shows "Not in the Guess List". It can share the box with `highlight` or be a separate input, whichever reads more clearly. With the Answer List toggle on, a searched word that isn't on the Answer List says so.
