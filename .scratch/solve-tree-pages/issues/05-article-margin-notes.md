# 05: Margin notes in Articles 07 and 08

**What to build:** A reader of Article 07 (Openers) finds a Margin note linking to the Opener Split page, beside the text on ranking Openers by their Feedback Split. A reader of Article 08 (Greedy Strategy) finds one linking to the Follow an Answer page, beside the Step-through Game. See [the spec](../spec.md).

**Blocked by:** 01, 03

**Status:** done

- [x] One short Margin note in each of the two English Articles, using the existing Margin note syntax and the site's link style.
- [x] The Article 08 note links to the Follow an Answer page with the Article's own example Answer (`watch`), so the Strategy and Answer match the text.
- [x] Thai Articles 07 and 08 already had Translations: the same note was added in Thai with /th/ links, and their `source` hashes were updated.
- [x] The build-time Article validation still passes, and `bun run screenshot` still covers both Articles.
- [x] `web-frontend.md`'s Article table mentions the new links.
