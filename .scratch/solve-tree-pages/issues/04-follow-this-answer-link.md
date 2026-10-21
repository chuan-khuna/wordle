# 04: "Follow this Answer" from the Opener Split page

**What to build:** On the Opener Split page, a reader who hovers, taps or focuses a word is offered "Follow this Answer". The link opens the Follow an Answer page with that word as the Answer and the Opener of the split it is in, so the reader goes from "where does this word land" to "how does the Solver find it". See [the spec](../spec.md).

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] `SplitGroups` takes a way to turn a word into an action or link. The Opener Split page uses it, and the Follow an Answer page does not.
- [ ] Hovering a word (mouse) or tapping it (touch) shows the word and the link. Words are focusable, and Enter on a focused word does the same.
- [ ] The link carries `answer` and `opener` and keeps the default Strategy. It is built with the language-aware path helper, so Thai pages link to the Thai page.
- [ ] On the compare view each split links with its own Opener.
- [ ] The word the reader picked stays highlighted until another is picked.
- [ ] Page text exists in English and Thai.
- [ ] `web-frontend.md` describes the link.
