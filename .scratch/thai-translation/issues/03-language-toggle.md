# 03: EN / ไทย toggle

**What to build:** A reader on any page clicks EN / ไทย in the sidebar (or the phone top-bar menu), beside the theme menu, and lands on the same page in the other language. The choice is remembered for links, and nobody is ever redirected by browser language. See [the spec](../spec.md).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The toggle sits beside the theme menu in the sidebar and in the phone top-bar menu, and shows the current language.
- [ ] It swaps `/` ↔ `/th`, `/articles/<slug>` ↔ `/th/articles/<slug>` and `/openers` ↔ `/th/openers`, through the path helper.
- [ ] On an English Article with no Translation yet, the Thai side is disabled (with a short note), never a broken link.
- [ ] The chosen language is written to `localStorage` inside try/catch; the page renders correctly when storage is unavailable.
- [ ] Opening any URL shows that URL's language: there is no automatic redirect.
- [ ] It is reachable and operable by keyboard, with an accessible name in the page's language.
- [ ] Screenshots show the toggle in both languages at phone and desktop widths.
- [ ] `web-frontend.md` and its `INDEX.md` line describe the toggle.
