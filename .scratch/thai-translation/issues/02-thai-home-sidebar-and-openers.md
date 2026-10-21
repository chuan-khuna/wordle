# 02: Thai home page, sidebar and `/th/openers`

**What to build:** A Thai reader opens `/th` and sees the Series title, intro and Part intros in Thai, with a Thai sidebar and Thai page text. No Article is translated yet, so every Article is listed with its English title and an "EN" tag, linking to its English page. `/th/openers` shows the Opener Distribution page with Thai page text (the Widget stays English). Thai pages declare `lang="th"` and set Thai letters in Noto Sans Thai Looped. See [the spec](../spec.md).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A Thai Series file holds the Thai Series title, intro and Part titles and intros, keyed by the English Part ids; the build fails if its Part ids differ from English.
- [ ] `/th` and `/th/openers` are statically generated, and `<html lang>` is `th` on them (still `en` on English pages).
- [ ] The Thai page-text table has every English key (enforced by its type and by a test), written in friendly Thai that calls the reader "คุณ", without ครับ/ค่ะ.
- [ ] In the Thai sidebar and Part lists, an untranslated Article shows its English title, an "EN" tag, and links to the English page.
- [ ] Noto Sans Thai Looped (Thai subset) comes after the Latin font in both the serif and sans stacks on Thai pages only; Thai body text has a line height of about 1.8.
- [ ] `bun test` covers the Series merging: Thai titles and intros replace English ones, untranslated Articles fall back with `translated: false`, mismatched Part ids fail.
- [ ] `bun run screenshot` also shoots the Thai pages; Thai text isn't clipped or cramped in any theme or width.
- [ ] The user approves the Thai Series and Part intros.
- [ ] `web-frontend.md` and its `INDEX.md` line describe the `/th` routes, the Thai content folder, the "EN" tag and the Thai font.
