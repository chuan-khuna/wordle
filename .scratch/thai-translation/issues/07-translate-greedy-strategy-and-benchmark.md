# 07: Translate 08 Greedy strategy and 09 Benchmark

**What to build:** A Thai reader can read 08 Greedy strategy and 09 Benchmark in Thai on `/th` (about 1,670 English words). The sidebar drops their "EN" tags, and the toggle works on them. They follow the tone and wording agreed in the 01 Rules pilot. See [the spec](../spec.md).

**Blocked by:** 04 (including the user's approval of the pilot)

**Status:** ready-for-agent

- [x] Each Article has a Translation with `title`, `summary` and `source` set to the English file's current hash.
- [x] Friendly written Thai calling the reader "คุณ", no ครับ/ค่ะ; glossary terms, example words and Mark labels in English; the wording agreed in ticket 04's Comments is used.
- [x] Margin notes are translated; Widgets, code blocks and video embeds are untouched.
- [x] A production build passes the Translation check with no stale-hash warning for these Articles.
- [x] Screenshots of these Thai Articles show no clipped or cramped Thai text, and every Widget still works.
- [ ] The user reviews and approves the Thai text of each Article.

## Comments

Written: `content/th/articles/08-greedy-strategy.mdx` and `09-benchmark.mdx`. Code blocks, Widgets (`StepThroughGame` x2, `SideBySideGame`, `BenchmarkChart`, `Boards`/`Board`) are byte-identical to English (checked by script); `##` counts match. `bun test` (144), typecheck, lint and the production build pass, no stale-hash warning, and the build emits `/th/articles/greedy-strategy` and `/th/articles/benchmark`. Screenshots (desktop and phone, `rose-pine-dawn` and `nord`) show no clipped Thai and every Widget renders with data (the `SideBySideGame` fills in as it plays). A margin note on `/th/articles/feedback-split` sits in the right column and reads cleanly. The user-review box is open.

**New wording (reuse for 10-11).**
- Titles: "Greedy Strategy", "Benchmark". Headings: "Guess ที่ชนะไม่ได้", "มันแสดงอะไร", "การค้นหา All words หนีออกมาได้อย่างไร".
- "greedy" stays English lowercase; "trap" is "กับดัก"; "family (of words)" is "กลุ่ม"; "rule of thumb" is "กฎง่าย ๆ"; "narrow setting" is "การตั้งค่าแบบแคบ"; "(Game) lost" is "แพ้" with the Term "Loss" kept; "wins"/"Win" is "ชนะ"/"Win".
- "Game"/"Games" and "Loss"/"Losses" are written singular in Latin script ("2,315 Game", "11 Loss"); "Guesses" is "Guess" ("8 Guess", "แปด Guess").
- "Candidates only" / "All words" / "Guess List, All words" stay English even in running Thai.
- "coin toss" is "โยนเหรียญ"; "ringed" is "วงไว้"; "dashed rule" is "เส้นประ"; "side by side" is "เคียงกัน"; "steadier" is "นิ่งกว่า".
