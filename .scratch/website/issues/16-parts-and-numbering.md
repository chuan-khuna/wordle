# Parts and two-digit Article numbers

Status: ready-for-agent
Blocked by: 14

Group the Series' Articles into Parts (see the "Part" entry in `GLOSSARY.md` and the updated spec).

- `content/series.mdx` defines the Parts in order: an id, a title and a short intro each. Every Article names its `part` in frontmatter. `order` runs through the whole Series. The build fails on an unknown Part, on an Article without a Part, or when a Part's Articles are not consecutive in `order`.
- The home page shows the Series title, intro and video, then each Part (title and intro) with its Articles. The sidebar groups the Articles under their Part titles. An Article page shows its Part next to its number (for example "Part 2 · Solving Wordle · 05").
- Article numbers are always two digits with leading zeros (`01`, `02` … `11`) everywhere they appear: sidebar, home page, Article header and prev/next links. Use the mono font with tabular figures.
- Remove every "sample" prefix: no `sample-` slugs, no "Sample:" titles, no "Sample Series". Lay the content out as the real Series from the spec: the two Parts and eleven Article files with real slugs (for example `rules`, `feedback`, `building-the-game`, `solving-introduction`, `candidate-set`, `feedback-split`, `expected-information`, `openers`, `greedy-strategy`, `benchmark`, `greedy-vs-optimal`), real titles, `part`, `order` and sensible Prerequisites. Move the existing sample bodies and Widgets into the matching Articles; the rest get a short stub body. Ticket 10 writes the full text into these files.
- Update `docs/documents/web-frontend.md`.

See [spec](../spec.md).
