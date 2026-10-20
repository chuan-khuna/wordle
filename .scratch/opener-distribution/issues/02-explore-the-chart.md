# 02: Explore the chart: tooltip, Strategy, filter, highlights, phones

**What to build:** On `/openers` a reader can explore the Opener Distribution:
- Hover or tap any block to see the Opener's word, rank, Average Guess Count (3 decimals), Losses and whether it's on the Answer List.
- Switch between the four Strategies.
- Show only Answer List Openers (off by default on the page).
- Type words to highlight. Their blocks turn the accent colour and get a label.

The same settings work as Widget props and `id`-namespaced URL params, so an Article can fix them and hide the controls. On a phone the chart scrolls sideways inside its own frame, and the page never does. A partly built summary is charted with a note "N of 14,855 Openers played". A short intro paragraph sits above the chart on the page. See [the spec](../spec.md).

**Blocked by:** 01 (Opener Distribution tracer: endpoint to `/openers` page)

**Status:** ready-for-agent

- [ ] The tooltip shows word, rank, Average Guess Count to 3 decimals, Losses and Answer List yes/no, on hover and on tap.
- [ ] The Strategy picker fetches the chosen Strategy. The Answer List toggle filters on the client with no new request. The grouping tests are extended to cover the filter.
- [ ] `highlight` (a comma list, or the word box on the page) draws those Openers in the accent colour with their words printed. Unknown words are ignored.
- [ ] `strategy`, `answersOnly`, `highlight` and `controls` work as props and as URL params that override them, namespaced by `id` like the other Widgets.
- [ ] When `complete_rows < total_rows`, the chart shows what there is, plus the "N of 14,855 Openers played" note.
- [ ] At 360px wide, bars keep a minimum width and the chart frame scrolls sideways. The x axis is labelled every 0.05.
- [ ] The `/openers` page has a short intro paragraph above the Widget.
- [ ] `web-frontend.md` describes the props, URL params, tooltip and phone behaviour.
