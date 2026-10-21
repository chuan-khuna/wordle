# 08: Translate 10 Greedy vs optimal and 11 Opener distribution

**What to build:** A Thai reader can read 10 Greedy vs optimal and 11 Opener distribution in Thai on `/th` (about 1,170 English words). The sidebar drops their "EN" tags, and the toggle works on them. They follow the tone and wording agreed in the 01 Rules pilot. See [the spec](../spec.md).

**Blocked by:** 04 (including the user's approval of the pilot)

**Status:** ready-for-agent

- [x] Each Article has a Translation with `title`, `summary` and `source` set to the English file's current hash.
- [x] Friendly written Thai calling the reader "คุณ", no ครับ/ค่ะ; glossary terms, example words and Mark labels in English; the wording agreed in ticket 04's Comments is used.
- [x] Margin notes are translated; Widgets, code blocks and video embeds are untouched.
- [x] A production build passes the Translation check with no stale-hash warning for these Articles.
- [x] Screenshots of these Thai Articles show no clipped or cramped Thai text, and every Widget still works.
- [ ] The user reviews and approves the Thai text of each Article.
- [x] If 05–07 are done too, no Thai page shows an "EN" tag any more.

## Comments

Written: `content/th/articles/10-greedy-vs-optimal.mdx` and `11-opener-distribution.mdx`. Article 10 has no Widgets or code; 11 has the one `OpenerDistribution` Widget (copied verbatim) and `##` counts match. `bun test` (144), typecheck, lint and the production build pass with no stale-hash warning for any Thai Article; the build lists all eleven `/th/articles/*` routes. The link to the full page is `/th/openers`, and the Translation check accepted it (links are not structure). Screenshots (desktop and phone, `rose-pine-dawn` and `nord`) show no clipped Thai; the `OpenerDistribution` renders with data and the margin note on 10 sits in the right column on desktop and inline on phone. EN-tag sweep: no built `/th` page contains the EN tag markup, and every English Article links to its Thai page in the toggle. The user-review box is open.

**New wording (for any later edit).**
- Titles: "Greedy เทียบกับ Optimal"; "Opener Distribution". Headings: "ค่า optimum", "ทำไม greedy จึงใกล้ขนาดนี้", "สองอันดับที่ไม่ตรงกัน", "Opener ยอดนิยม เมื่อเล่นจนจบ", "salet หรือ slate?". "optimum" and "optimal" stay English lowercase like "greedy".
- "play out / played out" is "เล่นจนจบ"; "ranking" is "อันดับ"; "tie" is "เสมอกัน"; "myths" (tab label) is "ความเชื่อบางอย่าง"; "block" is "บล็อก"; "behind" is "ตามหลัง"; "favourites" is "คำโปรด"; "famous" is "มีชื่อเสียง"; "exact solution" is "คำตอบที่แน่นอน"; "reproduced" is "ทำผลซ้ำ".
- Widget tab names (Best Openers, Myths, Bad Openers, All) and "Only Openers on the Answer List" stay English.

