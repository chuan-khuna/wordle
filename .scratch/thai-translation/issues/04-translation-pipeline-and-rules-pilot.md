# 04: Translation pipeline and the 01 Rules pilot

**What to build:** A Thai reader opens `/th/articles/rules` and reads Article 01 in Thai, with glossary terms in English and glossary cards showing Thai definitions. The sidebar drops its "EN" tag, and the toggle now works on that Article. The build checks every Translation against its English original. This pilot sets the tone for the other ten Articles, so the user reviews it before any more are written. See [the spec](../spec.md).

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Thai Article routes are generated for every Article that has a Translation; Prerequisites, Part, number and video timestamp come only from the English file.
- [x] Thai frontmatter holds only `title`, `summary` and `source` (the git blob hash of the English file translated from); the build fails on a Thai file with no English Article or a missing `title`/`summary`.
- [x] The Translation check is a pure function: the build fails when the Widgets (tag, `id`, props, order), the number of `##` headings or the code blocks differ, naming the file and the first mismatch. Prose components (`<Term>`, `<Word>`, `<Mark>`, `<Letter>`, `<MarginNote>`) and text inside fenced code are ignored.
- [x] A stale `source` hash prints a warning at build time and never fails it.
- [x] A complete Thai glossary has exactly the English term names, with Thai definitions in which terms stay English; the Thai Mark definition keeps the `**Correct** (…)` shape. The build fails on a missing or extra term.
- [x] On Thai pages, glossary cards show Thai definitions and still nest; Mark cards show the Thai Mark definitions.
- [x] On Thai pages, Prerequisite links, backlinks and prev/next go to the Thai page when it exists, and to the English page (with the "EN" tag) when it doesn't.
- [x] 01 Rules is translated: friendly written Thai calling the reader "คุณ", no ครับ/ค่ะ, glossary terms and example words in English, code and Widgets untouched.
- [x] `bun test` covers the Translation check (missing, extra, reordered or renamed Widget; changed `id` or prop; changed heading count; changed code block; ignored prose components and code text; stale vs current hash), the Article merging (English-only fields ignored in Thai frontmatter, unknown slug, missing `title`), and the Thai glossary (same term names, Thai Mark kinds parse, English terms linked inside Thai definitions).
- [ ] The user reviews and approves the Thai text of 01 Rules and the Thai glossary. Agreed Thai wording for recurring phrases is noted in this ticket's Comments, for tickets 05–08.
- [x] `web-frontend.md` and its `INDEX.md` line describe Translations, the `source` hash, the Translation check and the Thai glossary.

## Comments

Built; the user-review box is open, so the Status is unchanged.

**Code.** `lib/translation.ts` (pure): `checkTranslation`, `extractWidgets`, `countHeadings`, `codeBlocks`, `staleWarning`, `blobHash`; tests in `translation.test.ts`. Widgets are every capitalised tag except `Term/Word/Mark/Letter/MarginNote`; props compare by name, so order does not matter. `content.ts` `read()` now reads `content/th/articles/*.mdx`, runs the check against the English file (throws) and prints a stale-`source` warning once per process; `buildContent` also fails on a Thai file whose name differs from the English one. `glossary.ts`: `checkGlossary` (exact term names, no duplicates or empty definitions, Mark shape) runs when the Thai glossary is first used. `content/th/glossary.json` has all 41 terms. `app/(th)/th/articles/[slug]/page.tsx` generates only translated slugs; `ArticleView` imports the Thai body for `th`, 404s an untranslated slug, and adds the "EN" tag after Prerequisite, backlink and prev/next links to untranslated Articles. Screenshot script includes Thai Articles. Docs updated.

**Checked.** `bun test` (144), typecheck, lint and a production build pass; the build lists `/th/articles/rules` only. Screenshots of `/th/articles/rules` (desktop light, desktop dark, phone dark) show no clipping; Thai headings, paragraphs and the two code blocks look right. A hovered `Game` card opens in Thai and its `Guess Limit` opens nested. The English Rules page links to `/th/articles/rules` in the toggle. The Rules Article has no Widgets or margin notes, so none were exercised on a Thai page (Widgets are untouched MDX).

**Wording to review (reuse for 05-08 once approved).**
- Reader: "คุณ"; no ครับ/ค่ะ; short sentences, particles kept minimal; "..." between clauses is a space, not punctuation.
- Title "The rules" is "กติกา". Summary keeps the English terms: "Answer, Guess และรายการคำสองรายการ: Game คืออะไร และคุณ Win เมื่อไร".
- Glossary terms stay English even as verbs' objects: "ทาย Guess", "ได้ Win", "จบด้วย Loss", "Guess ใดตรงกับ Answer". Plain English "Guess" (not a Term link) is also left in Latin script, e.g. "คุณมี Guess ได้หกครั้ง".
- "making a Guess" is "ทาย" (guess, as a verb): "คุณหาคำนั้นด้วยการทาย Guess คือคำห้าตัวอักษรที่เกมยอมรับ".
- "the hidden word" is "คำลับ"; "the game" (the software) is "เกม"; "Game" the Term stays English.
- "word list" is "รายการคำ"; "common words" is "คำที่ใช้กันทั่วไป"; "strange word" is "คำแปลก ๆ"; "is refused" is "เกมจะปฏิเสธ"; "does not use up one of your six Guesses" is "ไม่นับเป็นหนึ่งใน Guess หกครั้งของคุณ".
- "verdict" is "ผลตัดสิน"; "reply" is "ตอบกลับ"; "puzzle" is "ปริศนา"; "question" is "คำถาม".
- Numbers: Arabic digits ("2,315 คำ"), "หกครั้ง" for six in prose.
- Part 1 / Series names follow ticket 03 ("การแก้ Wordle").
- Glossary: definitions are descriptive, no "คุณ" except Play and Assist (kept "คุณ" there). "Candidates only" and "All words" stay English and bold. "bit" is "บิต". Plural "Guesses" is written "Guess" (Thai has no plural), so `<Term>` links first-mention only.

**Deviations.** Prop order is ignored by the check (props compare by name). The check also treats fenced-code info strings (title, highlights) as part of the code block. The ticket's "stale vs current hash" test is on `staleWarning` with a fixed hash and `blobHash` is pinned to git's hash of "hello\n".


- 2026-10-21: User said "continue implement" without wording changes. Tickets 05–08 proceed using the pilot wording above as-is; the Thai text stays open for the user's later review.
