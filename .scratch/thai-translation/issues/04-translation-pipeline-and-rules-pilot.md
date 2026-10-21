# 04: Translation pipeline and the 01 Rules pilot

**What to build:** A Thai reader opens `/th/articles/rules` and reads Article 01 in Thai, with glossary terms in English and glossary cards showing Thai definitions. The sidebar drops its "EN" tag, and the toggle now works on that Article. The build checks every Translation against its English original. This pilot sets the tone for the other ten Articles, so the user reviews it before any more are written. See [the spec](../spec.md).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Thai Article routes are generated for every Article that has a Translation; Prerequisites, Part, number and video timestamp come only from the English file.
- [ ] Thai frontmatter holds only `title`, `summary` and `source` (the git blob hash of the English file translated from); the build fails on a Thai file with no English Article or a missing `title`/`summary`.
- [ ] The Translation check is a pure function: the build fails when the Widgets (tag, `id`, props, order), the number of `##` headings or the code blocks differ, naming the file and the first mismatch. Prose components (`<Term>`, `<Word>`, `<Mark>`, `<Letter>`, `<MarginNote>`) and text inside fenced code are ignored.
- [ ] A stale `source` hash prints a warning at build time and never fails it.
- [ ] A complete Thai glossary has exactly the English term names, with Thai definitions in which terms stay English; the Thai Mark definition keeps the `**Correct** (…)` shape. The build fails on a missing or extra term.
- [ ] On Thai pages, glossary cards show Thai definitions and still nest; Mark cards show the Thai Mark definitions.
- [ ] On Thai pages, Prerequisite links, backlinks and prev/next go to the Thai page when it exists, and to the English page (with the "EN" tag) when it doesn't.
- [ ] 01 Rules is translated: friendly written Thai calling the reader "คุณ", no ครับ/ค่ะ, glossary terms and example words in English, code and Widgets untouched.
- [ ] `bun test` covers the Translation check (missing, extra, reordered or renamed Widget; changed `id` or prop; changed heading count; changed code block; ignored prose components and code text; stale vs current hash), the Article merging (English-only fields ignored in Thai frontmatter, unknown slug, missing `title`), and the Thai glossary (same term names, Thai Mark kinds parse, English terms linked inside Thai definitions).
- [ ] The user reviews and approves the Thai text of 01 Rules and the Thai glossary. Agreed Thai wording for recurring phrases is noted in this ticket's Comments, for tickets 05–08.
- [ ] `web-frontend.md` and its `INDEX.md` line describe Translations, the `source` hash, the Translation check and the Thai glossary.
