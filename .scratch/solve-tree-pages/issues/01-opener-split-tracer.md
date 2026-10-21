# 01: Opener Split tracer: the `SplitGroups` view of one Opener

**What to build:** A reader follows a new "Opener Split" link under Explore (in the sidebar and in the phone top-bar menu, in English and Thai). The page shows the Feedback Split of `salet` over the whole Answer List as `SplitGroups`:

- one block per Feedback, biggest first, ties by lower Feedback Code;
- each block headed by the Guess with that Feedback's five Marks and the group's word count, with the head's Tiles smaller for smaller groups;
- under the head, every word of the group as plain Tiles in alphabetical order;
- each block about √n columns wide, never wider than the space;
- blocks flowing left to right and wrapping, as in the video's TRACE shot.

The reader can type any Guess List word as the Opener. The Opener is kept in the URL. See [the spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A pure split-groups module orders groups (count descending, then Feedback Code ascending) and their words (alphabetical). It gives a block's column count from its word count and the available columns (≈ √n, at least 1, capped), and the head's Tile size tier from the group size.
- [ ] `bun test` covers the module: tie-breaks, column counts at the edges (1 word, a perfect square, more columns than fit), and size tiers.
- [ ] `SplitGroups` renders a split response from `POST /api/split` (empty State) with plain Tiles for words (no Mark colours) and Marks only in the heads. It accepts an optional highlighted Feedback Code and an optional highlighted word, even though this page does not use them yet.
- [ ] The page `/opener-split` and `/th/opener-split` uses the shared view-per-language pattern of the Opener Distribution page, with all text in the page text table for both languages.
- [ ] The Opener input uses the existing word input. The default is `salet`. The `opener` URL param overrides it. A word off the Guess List shows the API's message and keeps the last good split.
- [ ] The Explore heading lists Opener Distribution, then Opener Split, in the sidebar and the phone menu.
- [ ] On a phone the blocks fit the width and the page never scrolls sideways. All ~2,315 word Tiles render without a noticeable lag; if they lag, each word is one element with letter spans.
- [ ] `bun run screenshot` includes the page (light and dark, phone and desktop).
- [ ] `web-frontend.md` and its `INDEX.md` summary describe `SplitGroups`, the page and the Explore link.
