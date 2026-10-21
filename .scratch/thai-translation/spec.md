# Thai Translation of the Series

Status: ready-for-agent

Builds on [the website](../website/spec.md). **Translation** is defined in `GLOSSARY.md`.

## Problem Statement

The website's one Series, "Solving Wordle" (eleven Articles in two Parts), is English only. Thai readers who are comfortable with Wordle and a little Python, but read Thai far more easily than English, have no way to follow it. Nothing on the site is set up for a second language either: the page text is hard-coded in English, `<html lang>` is always `en`, the fonts load only Latin letters, and the glossary cards have English definitions only.

## Solution

A Thai Translation of the whole Series, served under `/th` beside the English site.

- Every Article, the Series intro and both Part intros get a Thai Translation. Each says the same thing as its English original, with the same Prerequisites, Part, number and Widgets. The English file is always the original.
- The prose is friendly written Thai that calls the reader "คุณ", in short sentences, without ครับ/ค่ะ. Glossary terms stay English, in Latin script, inside Thai sentences (Feedback, Candidate, Opener), and so do example words (`crane`) and Mark labels.
- Widgets, code (with its comments and docstrings) and video embeds stay English.
- Page text (sidebar, Part labels, Prerequisites, backlinks, prev/next, Explore) and glossary card definitions are in Thai.
- Thai pages live at `/th`, `/th/articles/<slug>` (the same English slugs) and `/th/openers`, with `<html lang="th">`.
- A sidebar toggle (EN / ไทย) switches to the same page in the other language. It is remembered in `localStorage` and never redirects anyone automatically.
- Until every Article has a Translation, the Thai sidebar lists an untranslated Article with its English title and an "EN" tag, linking to its English page.
- Thai text uses Noto Sans Thai Looped, listed after the Latin fonts so English words keep Newsreader or Inter, with a taller line height (about 1.8).
- The build fails when a Translation's structure drifts from its English original, and warns when the English original has changed since it was translated.
- The work starts with a pilot (01 Rules) that the user reviews for tone before the other ten Articles are translated.

## User Stories

1. As a Thai reader, I want to read every Article in Thai, so that I can follow the Series without fighting the English.
2. As a Thai reader, I want the Series intro and Part intros in Thai, so that the home page tells me what the Series is about.
3. As a Thai reader, I want the glossary terms to stay in English, so that I can match them to the code, the English video and other Wordle material.
4. As a Thai reader, I want a glossary card to show its definition in Thai, so that I understand a term without leaving the page.
5. As a Thai reader, I want the terms inside a Thai definition to open their own cards, so that nested cards work as they do in English.
6. As a Thai reader, I want the Mark labels (Correct, Present, Absent) to explain themselves in Thai when I open them, so that the colours mean something to me.
7. As a Thai reader, I want the sidebar, Part labels, "Prerequisites", "Builds on this Article", prev/next and "Explore" in Thai, so that the page around the Article isn't English.
8. As a Thai reader, I want Thai text in a font made for Thai, with enough line height, so that stacked vowels and tone marks aren't cramped or clipped.
9. As a Thai reader, I want English words inside Thai sentences to look the same as on the English pages, so that terms and example words stand out consistently.
10. As a Thai reader, I want the Widgets to keep working on Thai pages exactly as on English pages, so that I can try every idea.
11. As a Thai reader, I want the code to be the real code from the repo, so that I can copy and run it.
12. As a Thai reader, I want the video embeds and their timestamps on Thai pages, so that I can still jump to the matching part of the video.
13. As a Thai reader, I want Prerequisite links, backlinks and prev/next on a Thai page to stay on Thai pages, so that I don't fall back into English by accident.
14. As a Thai reader, I want an untranslated Article to be listed with an "EN" tag, so that I know before I click that it will open in English.
15. As a Thai reader, I want the Series order and numbering to be identical to English, so that "Article 06" means the same thing in both.
16. As a reader, I want an EN / ไทย toggle in the sidebar, so that I can switch language at any point.
17. As a reader, I want the toggle to keep me on the same Article or page, so that I don't lose my place.
18. As a reader, I want my language choice remembered, so that the next page I open from the home page or sidebar is in my language.
19. As a reader, I want never to be redirected because of my browser's language, so that a shared English link opens in English.
20. As a reader on a phone, I want the toggle in the top-bar menu too, so that I can switch language on a small screen.
21. As a reader who uses a screen reader, I want Thai pages to declare `lang="th"`, so that my screen reader reads them with a Thai voice.
22. As a reader, I want `/th/openers` to exist, so that the Explore link works from Thai pages.
23. As a search engine user, I want Thai pages to have Thai titles and descriptions, so that I can find them in Thai search results.
24. As the author, I want the build to fail when a Translation's Widgets (tag, id, props, order) or its number of `##` headings differ from the English original, so that a Translation can't silently fall out of step.
25. As the author, I want the build to warn when an English original has changed since its Translation was made, so that I know which Translations to update without blocking a deploy.
26. As the author, I want a Translation's Prerequisites, Part and number to come only from the English file, so that I never maintain them twice.
27. As the author, I want the build to fail when a Thai file names an Article that doesn't exist in English, so that typos are caught.
28. As the author, I want the build to fail when the Thai glossary is missing a term the English glossary has, or has one it doesn't, so that no Thai card is ever empty.
29. As the author, I want the build to fail when the Thai page text is missing a key, so that no English label leaks into a Thai page.
30. As the author, I want the English site to look and behave exactly as before, so that the Translation work can't break it.
31. As the author, I want to review a pilot Translation before the rest are written, so that I can fix the tone once instead of eleven times.
32. As the author, I want to review each Translation before it is committed, so that the Thai is correct.
33. As the author, I want the screenshot script to cover Thai pages, so that I can check Thai typography in every theme and width.
34. As the author, I want the frontend docs to describe how Translations work, so that a later change keeps them in step.

## Implementation Decisions

- **Language.** A language is `en` or `th`. English is the default and the original. Every language-aware function takes the language as an argument that defaults to `en`, so existing callers keep working.
- **Routing.** English routes are unchanged. Thai routes mirror them under a `/th` segment: home, Article (statically generated for every English slug) and the Opener Distribution page. The root layout sets `<html lang>` from the route. A pure path helper swaps a path between languages (`/articles/x` ↔ `/th/articles/x`, `/` ↔ `/th`, `/openers` ↔ `/th/openers`), and every internal link the pages build goes through it.
- **Content layout.** Thai content lives in a Thai folder under the content root, mirroring English: the Series file (title, intro, Part titles and intros keyed by Part id), one Article file per Translation with the same file name as its English original, and a Thai glossary.
- **Thai Article frontmatter** holds only `title`, `summary` and `source`, the git blob hash of the English file it was translated from. Prerequisites, Part, number and video timestamp are never read from a Thai file.
- **The content loader** (`content(lang)`) returns the same shape for both languages: the same Series, Parts and Articles in the same order. For Thai, titles, summaries and intros come from the Thai files where they exist and fall back to English, and each Article carries a `translated` flag that drives the "EN" tag and the link target. The merging is a pure function, separate from the file reading, so it can be tested like `validateParts`. It fails on a Thai file whose slug has no English Article, on a missing or empty `title`/`summary`, and on a Thai Series file whose Part ids differ from English.
- **The Translation check** is a pure function given an English Article's source and its Translation's source. It extracts the Widget elements (capitalised MDX tags that are Widgets, not prose components like `<Term>`, `<Word>`, `<Mark>`, `<Letter>`, `<MarginNote>`), with tag name, `id` and props, in order, and the count of `##` headings, ignoring fenced code. Any difference fails the build with the file and the first mismatch. Code blocks must also match exactly, since code is never translated. A second pure function compares the recorded `source` hash with the English file's current hash and returns a warning (printed at build time, never thrown).
- **Glossary.** `lookupTerm` and `lookupMark` take the language. The Thai glossary has the same English term names as keys, with Thai definitions in which other terms appear in English, so `splitDefinition` links them unchanged. The Thai Mark definition keeps the `**Correct** (…)` / `**Present** (…)` / `**Absent** (…)` shape that `parseMarkKinds` reads. The language reaches `<Term>` and `<Mark>` through the MDX components the Article page passes in, not a global.
- **Page text.** The English strings the pages and sidebar use move into one table keyed by name, with a Thai table of the same keys. Its type forces the same keys, and a test checks it too.
- **Toggle.** A small client component beside the theme menu, in the sidebar and the phone top bar. It links to the swapped path, and writes the chosen language to `localStorage` in a try/catch. The home-page and sidebar links read the remembered language only for pages without a language in their URL; there is no automatic redirect. On an untranslated Article, the Thai side links to the Thai page (which says it's English-only and links to the English page) or is shown disabled.
- **Untranslated Articles** in the Thai Series: the sidebar and Part lists show the English title with an "EN" tag and link to the English page. A Thai Article route for an untranslated slug is not generated; links never point to it.
- **Fonts.** Noto Sans Thai Looped is loaded with the Thai subset through `next/font` and added after the Latin family in both the serif and sans stacks on Thai pages only, so English words keep Newsreader/Inter. Thai pages get a body line height of about 1.8 through a language-scoped rule in the design tokens.
- **Writing.** Claude writes every Translation from the English original; the user reviews each before it is committed. The pilot (01 Rules) fixes the tone, and Thai words for recurring non-glossary phrases, before the other ten are written.

## Testing Decisions

- Good tests check what a function returns or throws for given inputs, never how it gets there. Tests use small inline fixtures (a few lines of MDX, a two-Article Series) rather than the real content, and assert on error messages naming the file, as the existing tests do.
- **The Translation check** (the main seam): matching sources pass; a missing, extra, reordered or renamed Widget fails; a changed `id` or prop fails; a changed heading count fails; a changed code block fails; prose components and text inside fenced code are ignored; a stale `source` hash returns a warning and a current one returns none.
- **The content merging**: Thai titles and intros replace English ones; Prerequisites, Part and number always come from English even when a Thai file sets them; untranslated Articles fall back with `translated: false`; an unknown Thai slug, a missing `title` and mismatched Part ids fail.
- **Glossary with a language**: Thai lookups return Thai definitions; the Thai glossary has exactly the English term names; Thai Mark kinds parse; `splitDefinition` links English term names inside a Thai definition.
- **Path helper and page text**: paths swap both ways and round-trip; the Thai page-text table has every English key.
- Prior art: `parts.test.ts` (pure validators with file-naming errors) and `glossary.test.ts` (lookups and `splitDefinition`), run with `bun test`.
- Pages, the toggle and the fonts are checked with `bun run screenshot`, extended to Thai pages, and with a production build (which runs every check against the real content).

## Out of Scope

- Translating Widget labels, buttons, chart axes and table headers.
- Translating code, comments or docstrings.
- A Thai video, or Thai subtitles.
- Languages other than Thai, and a language picker beyond the two-way toggle.
- Redirecting by browser language or `Accept-Language`.
- Thai slugs.
- Translating the gpui desktop app, the terminal UI or the backend.
- Translating `GLOSSARY.md` itself or the implementation docs.

## Further Notes

- Thai has no spaces between words, so line breaking relies on the browser's Thai word segmentation; check long Thai paragraphs and headings in the screenshots, including `text-balance` headings.
- The Translation check deliberately compares structure, not meaning: a Translation that keeps every Widget and heading but mistranslates a sentence passes. The user's review covers meaning.
- `source` hashes make staleness visible without blocking: an English typo fix shouldn't stop a deploy, but it should be seen.
