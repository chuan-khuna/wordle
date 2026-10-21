# 06: Translate 04 Solving introduction, 05 Candidate Set, 06 Feedback Split and 07 Openers

**What to build:** A Thai reader can read 04 Solving introduction, 05 Candidate Set, 06 Feedback Split and 07 Openers in Thai on `/th` (about 2,300 English words). The sidebar drops their "EN" tags, and the toggle works on them. They follow the tone and wording agreed in the 01 Rules pilot. See [the spec](../spec.md).

**Blocked by:** 04 (including the user's approval of the pilot)

**Status:** ready-for-agent

- [x] Each Article has a Translation with `title`, `summary` and `source` set to the English file's current hash.
- [x] Friendly written Thai calling the reader "คุณ", no ครับ/ค่ะ; glossary terms, example words and Mark labels in English; the wording agreed in ticket 04's Comments is used.
- [x] Margin notes are translated; Widgets, code blocks and video embeds are untouched.
- [x] A production build passes the Translation check with no stale-hash warning for these Articles.
- [x] Screenshots of these Thai Articles show no clipped or cramped Thai text, and every Widget still works.
- [ ] The user reviews and approves the Thai text of each Article.

## Comments

Written: `content/th/articles/04-solving-introduction.mdx`, `05-candidate-set.mdx`, `06-feedback-split.mdx`, `07-openers.mdx`. Code blocks and Widgets were spliced from the English files by script; `##` counts match. `bun test` (144), typecheck, lint and the production build pass, no stale-hash warning, and the build lists all seven Thai Article routes. Screenshots (desktop and phone, `rose-pine-dawn` and `nord`) show no clipped Thai; `CandidateFilter`, `SplitExplorer` and `OpenerTable` render with data; the sidebar shows "EN" on 08-11 only. The user-review box is open.

**New wording (reuse for 08-11).**
- Titles: "อะไรทำให้ Guess แรกดี?" (04), "Candidate Set", "Feedback Split และ Expected Information", "Opener". Headings: "สองวิธีนับ", "สองวิธีอาจไม่ตรงกัน", "ดูมันเล็กลง", "การทดสอบเดียวกันใน Python", "การแบ่งที่เท่ากัน", "ตารางบอกอะไร", "จัดอันดับทุกคำ", "ทั้งสองใน Python".
- "Feedbacks", "Candidates", "Openers", "Marks" are written singular in Latin script (no plural).
- "halving" is "การหารครึ่ง" / "หารครึ่ง"; "bits" is "บิต"; "expectation" is "ค่าคาดหมาย"; "weighted average" is "ค่าเฉลี่ยถ่วงน้ำหนัก"; "probability" is "ความน่าจะเป็น"; "logarithm" is "ลอการิทึม"; "entropy" is "เอนโทรปี".
- "the introduction" (Article 04) is "บทนำ"; "the next Article" is "Article ถัดไป"; "chart" is "แผนภูมิ"; "bar" is "แท่ง"; "group" is "กลุ่ม"; "Widget" stays "Widget".
- "ruled out / out" is "ตัดออกไป" / "ตกรอบ"; "survive" is "รอด"; "split" (verb) is "แบ่ง".
- "a copy of a letter" did not come up; "สำเนา" was not used.
