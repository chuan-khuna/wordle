# 03: EN / ไทย toggle

**What to build:** A reader on any page clicks EN / ไทย in the sidebar (or the phone top-bar menu), beside the theme menu, and lands on the same page in the other language. The choice is remembered for links, and nobody is ever redirected by browser language. See [the spec](../spec.md).

**Blocked by:** 02

**Status:** done

- [x] The toggle sits beside the theme menu in the sidebar and in the phone top-bar menu, and shows the current language.
- [x] It swaps `/` ↔ `/th`, `/articles/<slug>` ↔ `/th/articles/<slug>` and `/openers` ↔ `/th/openers`, through the path helper.
- [x] On an English Article with no Translation yet, the Thai side is disabled (with a short note), never a broken link.
- [x] The chosen language is written to `localStorage` inside try/catch; the page renders correctly when storage is unavailable.
- [x] Opening any URL shows that URL's language: there is no automatic redirect.
- [x] It is reachable and operable by keyboard, with an accessible name in the page's language.
- [x] Screenshots show the toggle in both languages at phone and desktop widths.
- [x] `web-frontend.md` and its `INDEX.md` line describe the toggle.

## Comments

Built. `components/LanguageToggle.tsx` (client) sits in the sidebar header beside the theme menu (so also in the phone top bar); pure `lib/language-switch.ts` `switchTarget` (tested) picks the target via `pathIn`, or null when no Thai page exists (home, `/openers` and translated Articles only; `SiteDocument` derives the translated slugs from `content("th")`). Null renders a disabled, focusable `aria-disabled` option plus a visible "Not in Thai yet" note. New page-text keys `language`, `englishName`, `thaiName`, `notInThai` in both tables. Click writes `wordle-language` to `localStorage` in try/catch.

"Remembered for links" is ambiguous: every page and sidebar link is already in its URL's language, so the saved value is written but nothing reads it (no redirect, ever). Documented in `web-frontend.md`; add a reader only if a language-less entry point appears. On desktop the sidebar header is now two rows (title, then toggle and theme menu) because the 224px column could not hold all three; English Article pages show the one-line note under the toggle until they have a Translation. Verified with Playwright: click and keyboard Enter switch `/` to `/th`, the disabled option has no href.
