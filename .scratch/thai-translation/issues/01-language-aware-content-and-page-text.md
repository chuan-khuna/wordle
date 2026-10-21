# 01: The content loader, glossary and page text take a language (still English only)

**What to build:** Prefactoring with no visible change, so that the Thai work is easy. The content loader, the glossary lookups and the links the pages build all take a language, defaulting to English. The English page text (sidebar, "Part N", "Prerequisites", "Builds on this Article", prev/next, "Explore") moves out of the components into one table keyed by name. The English site looks and behaves exactly as before. See [the spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `content()` takes a language (default English) and returns the same shape as now; its merging step is a pure function, separate from file reading.
- [x] `lookupTerm` and `lookupMark` take a language (default English); `<Term>` and `<Mark>` get the language from the MDX components the Article page passes in, not a global.
- [x] A pure path helper builds and swaps paths between languages; every internal link the pages and sidebar build goes through it.
- [x] The English page text lives in one table keyed by name, typed so a second language must have the same keys.
- [x] `bun test` covers the path helper (both directions, round trip); the existing tests still pass unchanged.
- [x] A production build succeeds and the screenshots of the English pages are unchanged.
- [x] `web-frontend.md` and its `INDEX.md` line describe the language argument and the page-text table.

## Comments

Done. New: `lib/language.ts` (`Language`, `DEFAULT_LANGUAGE`), `lib/paths.ts` (`pathIn(path, lang)`, `languageOf`, `articlePath`, `homePath`, `openersPath`), `lib/page-text.ts` (`PageText` type, `pageText(lang)`; English table only), and `SeriesPage`, `ArticleView`, `OpenersView` in `components/` (the pages' bodies, taking `lang`, because a Next page cannot take extra props; the `app/` pages are thin wrappers). `content(lang)` splits file reading from the pure `buildContent(raw)` (new `content.test.ts`); for now every language gets the English content. `glossary(lang)`, `lookupTerm` and `lookupMark` take a language and throw for one with no glossary; `componentsFor(lang)` in `mdx-components.tsx` binds `<Term>`/`<Mark>` to it and `TermTip` passes it to nested cards. `Sidebar` takes `lang`. Tests for paths, page text, content and the glossary language argument added; existing tests unchanged. Docs: `web-frontend.md` (new "Languages" section) and its INDEX line.

Deviations: "Status: done" is not one of the five triage labels, but the website tickets use it. `pageText` and `glossary` use a `Partial<Record<Language, ...>>` table, so "a second language must have the same keys" is enforced by the `PageText` type, and a language with no table throws. English screenshots are byte-identical except a sub-pixel shift of the middle dot in the Article eyebrow ("Part 1 · ... · 01") at 390px on three Articles, from the "Part N" text now being one string.
