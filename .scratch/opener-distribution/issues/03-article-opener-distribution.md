# 03: Article 11: Opener Distribution

**What to build:** A reader who finishes the Benchmark Article can read a new Article, "Opener Distribution", the eleventh in the Solving Wordle Part. It follows the outline in [the spec](../spec.md):
- every Guess List word played as the Opener (the Guess Count Matrix)
- each Opener's Average Guess Count
- the embedded Opener Distribution (`bits-all` fixed, Answer List only, no controls, highlighting tarse, salet, raise and crane)
- the findings: under `bits-all` the best Opener is tarse (3.429) and the worst qajaq (4.117), so less than one Guess separates them. Raise ranks 95th and crane 7th. Under Candidates-only, salet is best and raise ranks 420th.
- why ranking by Expected Information and ranking by play disagree

The Article ends with "See the full Opener Distribution →" linking to `/openers`, and the `/openers` intro links back to the Article. The Series intro and the Solving Wordle Part intro mention the new Article.

**Blocked by:** 02 (Explore the chart: tooltip, Strategy, filter, highlights, phones)

**Status:** ready-for-agent

- [x] The Article is numbered 11, in Part `solving-wordle`, with Prerequisite `benchmark`. Existing Article numbers stay unchanged.
- [x] Its figures match `summary.json`, rechecked when the Article is written.
- [x] It embeds the fixed Widget and links to `/openers`, and `/openers` links back to it.
- [x] The Series intro says "eleven short Articles", and the Solving Wordle Part intro adds that every possible Opener is played out.
- [x] The glossary terms are used (Opener, Average Guess Count, Guess Count Matrix, Opener Distribution), with `<Term>` where the other Articles use it.
- [x] The Article build validation passes.
- [x] `web-frontend.md` and its `INDEX.md` summary mention Article 11.
