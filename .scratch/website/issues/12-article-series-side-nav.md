# Article page: Series side nav, no "In the video" section

Status: done

On the Article page, remove the "In the video" section (the embed that starts at the Article's `video` time and the "Open it on YouTube" link). Keep the Article's `video` frontmatter and the Series page's "Watch from m:ss" links.

Add a side nav to the Article page that lists every Article of its Series in `order`, with the current Article marked (`aria-current="page"`). On wide screens it sits beside the Article and stays in view while scrolling; at phone width it collapses above the Article (for example a `<details>` disclosure) with no horizontal page scroll. It uses theme roles only. Keep the prev/next links. Update `docs/documents/web-frontend.md`.

See [spec](../spec.md).

## Comments

Done. Removed the Article page's "In the video" section (frontmatter, validation and Series page links kept; `VideoEmbed` and the YouTube helpers are still used by the Series page). Added `SeriesNav`: sticky column at `lg`, `<details>` below. Site container widened to `max-w-6xl`; prose text blocks capped at 70ch; index and Series pages stay `max-w-3xl`. Checked in headless Chromium at 1280 and 390 px, including `sample-benchmark`.
