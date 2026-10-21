# 01: The content loader, glossary and page text take a language (still English only)

**What to build:** Prefactoring with no visible change, so that the Thai work is easy. The content loader, the glossary lookups and the links the pages build all take a language, defaulting to English. The English page text (sidebar, "Part N", "Prerequisites", "Builds on this Article", prev/next, "Explore") moves out of the components into one table keyed by name. The English site looks and behaves exactly as before. See [the spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `content()` takes a language (default English) and returns the same shape as now; its merging step is a pure function, separate from file reading.
- [ ] `lookupTerm` and `lookupMark` take a language (default English); `<Term>` and `<Mark>` get the language from the MDX components the Article page passes in, not a global.
- [ ] A pure path helper builds and swaps paths between languages; every internal link the pages and sidebar build goes through it.
- [ ] The English page text lives in one table keyed by name, typed so a second language must have the same keys.
- [ ] `bun test` covers the path helper (both directions, round trip); the existing tests still pass unchanged.
- [ ] A production build succeeds and the screenshots of the English pages are unchanged.
- [ ] `web-frontend.md` and its `INDEX.md` line describe the language argument and the page-text table.
