# 05: Translate 02 Feedback and 03 Building the game

**What to build:** A Thai reader can read 02 Feedback and 03 Building the game in Thai on `/th` (about 1,460 English words). The sidebar drops their "EN" tags, and the toggle works on them. They follow the tone and wording agreed in the 01 Rules pilot. See [the spec](../spec.md).

**Blocked by:** 04 (including the user's approval of the pilot)

**Status:** ready-for-agent

- [x] Each Article has a Translation with `title`, `summary` and `source` set to the English file's current hash.
- [x] Friendly written Thai calling the reader "คุณ", no ครับ/ค่ะ; glossary terms, example words and Mark labels in English; the wording agreed in ticket 04's Comments is used.
- [x] Margin notes are translated; Widgets, code blocks and video embeds are untouched.
- [x] A production build passes the Translation check with no stale-hash warning for these Articles.
- [x] Screenshots of these Thai Articles show no clipped or cramped Thai text, and every Widget still works.
- [ ] The user reviews and approves the Thai text of each Article.

## Comments

Written: `content/th/articles/02-feedback.mdx` and `03-building-the-game.mdx`. Widgets, code blocks and the `##` count match English; `bun test` (144), typecheck, lint and the production build pass with no stale-hash warning, and the build lists both Thai routes. Screenshots (desktop and phone, light `rose-pine-dawn` and dark `nord`) show no clipped Thai; the `FeedbackScorer` renders with data, the margin note sits in the right column on desktop, and the "EN" tags on Prerequisites, backlinks and prev/next appear only on untranslated Articles. The user-review box is open.

**New wording (reuse for 06-08).**
- Titles: "Feedback"; "การสร้าง Game". Headings: "กฎของตัวอักษรที่ซ้ำ" (the repeated-letter rule), "ฟังก์ชัน" (the function), "Guess และ State", "Game", "Loop".
- "Mark" in Thai prose stays English, singular ("Mark ห้าอัน", "ทุก Mark"); plural "Marks" is written "Mark". Mark labels Correct/Present/Absent stay English, also as adjectives ("ตัวอักษร Present").
- "pass one / pass two" is "รอบที่หนึ่ง / รอบที่สอง". "letter" is "ตัวอักษร"; "position" is "ตำแหน่ง"; "copy of a letter" is "สำเนา"; "used up" is "ถูกใช้ไปแล้ว".
- "frozen", "error", "loop", "Solver", "State" stay English; "tiles" is "กระเบื้อง".
- "Remember that number" is "จำไว้ว่าเลขนี้"; "Strictly" is "พูดให้ตรงที่สุด".
