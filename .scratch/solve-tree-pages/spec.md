# Solve Tree pages: Opener Split and Follow an Answer

Status: ready-for-agent

Builds on [the website](../website/spec.md), [Opener Distribution](../opener-distribution/spec.md) (the Explore section) and [the Thai Translation](../thai-translation/spec.md) (every page takes a language).

Inspired by Ballpark Figures' video "I Solved Wordle*", which draws the **Solve Tree** (see `GLOSSARY.md`) and, for one Opener such as TRACE, every Feedback group laid out as blocks, biggest first.

## Problem Statement

A reader of the Series learns what a Feedback Split is (Article 06) and that Openers are ranked by it (Article 07), but only ever sees a split as bars and one word list at a time. They can't see the whole Answer List fall apart into groups under an Opener, so they can't build an intuition for why one Opener is better than another. And when the Solver plays an Answer (Article 08's Step-through Game) they see the Guesses and the Candidate Set size, but not how the group holding the Answer shrinks, Guess by Guess, until one word is left.

## Solution

Two new pages under **Explore** in the sidebar, after Opener Distribution, in English and Thai. Both are built on one new component, `SplitGroups`.

- **`SplitGroups`**: the Feedback Split of one Guess over one Candidate Set, with every word shown.
  - Each Feedback is a block headed by the Guess with that Feedback's five Marks and the group's word count. Nothing else goes in the head: no bar and no percentage.
  - Under the head, every word of the group as plain text (no Tiles, no Mark colours), in alphabetical order.
  - A block is about √n columns wide (n = its word count), never wider than the space available.
  - Blocks flow left to right and wrap, biggest first; ties go by lower Feedback Code.
  - The head's Tiles get smaller as the group gets smaller, as in the video.
  - The Win group (`22222`) is a block like any other.
  - It can highlight one group (outlined) and one word (in strong text).
  - On desktop, a "Full screen" toggle (URL param `fit`) opens the whole split in a full-window view, laid out to the window's shape and scaled so every block fits with no scrolling, like the video's single shot. An Exit button or Escape closes it.
- **Opener Split page** (`/opener-split`, `/th/opener-split`): learn to choose an Opener.
  - The reader types an Opener, any Guess List word, default `salet`. It shows `SplitGroups` over the whole Answer List with these figures: number of groups, largest group, number of single-word groups, Expected Information and Expected Candidates.
  - **No Strategy picker**: an Opener's split of the Answer List does not depend on the Strategy.
  - A "Compare" button adds a second Opener with its own figures. Both inputs sit together at the top; the two splits are in two columns on wide screens and stacked on narrow ones.
  - Hovering or tapping a word offers "Follow this Answer", a link to the Follow an Answer page with that Answer and this Opener.
  - There is no drilling into groups: that is the other page's job.
- **Follow an Answer page** (`/follow`, `/th/follow`): see the Solver home in on one Answer.
  - Inputs: the Answer (an Answer List word), the Strategy (the existing `StrategyPicker`: Guess Pool, Search Scope, Ranking) and the Opener (default: the Strategy's best Opener, ranked over the whole Guess Pool as everywhere else; the reader may type any Guess Pool word).
  - It shows **one row at a time**: row k is `SplitGroups` of Guess k over the Candidate Set before it. The Answer's group is outlined and the Answer itself highlighted.
  - A sticky navigation strip lists the Guesses with their Feedback (`SALET ⬛🟨⬛⬛⬛ › …`). Clicking one jumps to its row. Prev and Next buttons step through the rows.
  - The last row is the Win.
  - It is separate from the Step-through Game: Article 08 and that Widget are not changed.

Every input is a URL param, so a view can be shared. Page text lives in the typed page text table for both languages.

## User Stories

1. As a reader, I want an "Opener Split" link under Explore in the sidebar, so that I can find the page from anywhere on the site.
2. As a reader on a phone, I want the same link in the top-bar menu, so that I can reach it on a small screen.
3. As a reader, I want the Opener Split page to open on a sensible default Opener, so that I see a full split before typing anything.
4. As a reader, I want to type any Guess List word as the Opener, so that I can try my own favourite.
5. As a reader, I want a clear message when my word is not on the Guess List, so that I know why nothing changed.
6. As a reader, I want to see every Answer List word placed in its Feedback group, so that I see the whole Answer List split by the Opener.
7. As a reader, I want each group headed by the Opener with that group's Marks, so that I can read which Feedback leads to the group.
8. As a reader, I want each group's word count in its head, so that I can compare group sizes at a glance.
9. As a reader, I want the biggest groups first, so that the worst outcomes of an Opener are the first thing I see.
10. As a reader, I want bigger groups drawn as bigger blocks with bigger heads, so that the shape of the split stands out as it does in the video.
11. As a reader, I want the words in a group in alphabetical order, so that I can find a word quickly.
12. As a reader, I want the number of groups, the largest group, the number of single-word groups, the Expected Information and the Expected Candidates beside the split, so that I can put numbers on what I see.
13. As a reader, I want to compare two Openers side by side (stacked on a narrow screen), so that I can see why a good Opener beats a bad one.
14. As a reader, I want to remove the second Opener, so that I can go back to one split.
15. As a reader, I want the Opener (and the compared Opener) in the URL, so that I can share exactly what I am looking at.
16. As a reader, I want to hover or tap a word and follow it as the Answer, so that I can go from "where does this word land" to "how does the Solver find it".
17. As a reader, I want a "Follow an Answer" link under Explore, so that I can open that page directly.
18. As a reader, I want to type an Answer, so that I can follow today's Wordle or any word I care about.
19. As a reader, I want a clear message when my word is not on the Answer List, so that I know it can't be an Answer.
20. As a reader, I want to choose the Strategy with the same Guess Pool, Search Scope and Ranking buttons as elsewhere on the site, so that I don't have to learn a new control.
21. As a reader, I want the Opener to default to the Strategy's best Opener, so that I see what the Solver would really play.
22. As a reader, I want to type my own Opener, so that I can see how the Solver carries on from my usual first Guess.
23. As a reader, I want to see one Guess at a time, so that the shrinking of the Answer's group is clear and not lost in a long page.
24. As a reader, I want the Answer's group outlined and the Answer highlighted in every row, so that I can always find where it is.
25. As a reader, I want Prev and Next buttons, so that I can step through the Game.
26. As a reader, I want a strip of the Guesses and their Feedback that stays in view, so that I always know where I am and can jump to any Guess.
27. As a reader, I want the last row to show the Win, so that the Game visibly ends.
28. As a reader, I want an Answer that equals the Opener to give a one-Guess Game, so that the edge case still makes sense.
29. As a reader, I want the Answer, Strategy, Opener and current Guess in the URL, so that I can share a step of a Game.
30. As a Thai reader, I want both pages under `/th`, with Thai page text and the Thai font, so that the Explore section works in my language.
31. As a reader on a phone, I want blocks to fit the screen width without the page scrolling sideways, so that the pages work on a phone.
32. As a reader using a keyboard, I want every control reachable and the word links focusable, so that I don't need a mouse.
33. As a reader of Article 07, I want a Margin note linking to the Opener Split page, so that I can explore Openers further.
34. As a reader of Article 08, I want a Margin note linking to the Follow an Answer page, so that I can watch any Answer being found.
35. As a video maker, I want the views to look like the video's shot, so that I can record clean takes from the site.
36. As a maintainer, I want the backend's existing behaviour unchanged when no Opener is given, so that the Step-through Game and Side-by-side Game keep working.

## Implementation Decisions

- **Glossary**: **Solve Tree** was added to `GLOSSARY.md`. No other new term: "following an Answer" is the Game a Strategy plays for that Answer. The Candidate words are plain text with no Marks: Marks belong to the Guess only.
- **Backend**: `GET /api/solve` gets an optional `opener` param.
  - When given, it must be a Guess Pool word, or the response is 400. It becomes Guess 1, and the following Guesses come from the Strategy as before.
  - Its alternatives at step 1 are still the Strategy's top Suggestions, so the table shows how the chosen Opener compares.
  - When `opener` is missing, the response is byte-for-byte what it is today.
- **No new split endpoint**: `POST /api/split` already returns, for a Guess and a State, every group (Marks, Feedback Code, count, words) plus bits, Expected Candidates, groups and largest group.
  - The Opener Split page sends an empty State.
  - The Follow an Answer page calls `/api/solve` once, then `/api/split` for each row with the State of the Guesses before it.
  - The number of single-word groups is counted on the frontend.
- **New pure frontend module (split groups)**, tested on its own:
  - group order (count descending, then Feedback Code ascending; words alphabetical);
  - a block's column count from its word count and the available width (≈ √n, at least 1, capped);
  - the head's Tile size tier from the group size;
  - the single-word group count;
  - turning `/api/solve` steps into one State per row;
  - finding the Answer's group in a row.
- **`SplitGroups` component**: props are the split response, an optional highlighted Feedback Code and an optional highlighted word, plus a callback (or link builder) for a word, so that the Opener Split page can offer "Follow this Answer". The head Tiles reuse the existing `Tile` component; the words are plain text.
- **Pages**: each page is a view component taking the language, as the Opener Distribution page does, rendered by both route groups. Inputs use the existing `WordRow` word input and `useWidgetParam`-style URL params.
  - Opener Split params: `opener`, `compare`.
  - Follow an Answer params: `answer`, `pool`, `scope`, `by`, `opener`, `step`.
- **Sidebar**: the Explore heading lists Opener Distribution, Opener Split, then Follow an Answer.
- **Margin notes**: these go in Articles 07 and 08, in English and in their Thai Translations.
- **Docs**: `web-frontend.md`, `web-backend.md` and the `INDEX.md` summaries are updated with each change.

## Testing Decisions

- Tests check behaviour through the highest seam, not internals. There are two seams:
  - **Backend, through the HTTP endpoint** (the existing API test client and its `test_solve_*` tests):
    - `opener` becomes Guess 1;
    - the Game still ends in a Win;
    - a word off the Guess Pool gets 400;
    - an Answer equal to the Opener is a one-Guess Game;
    - no `opener` gives the same Game as before.
  - **Frontend, the pure split-groups module** with `bun test`, like `split-chart.test.ts`, `opener-bars.test.ts` and `side-by-side.test.ts`. It covers ordering and tie-breaks, column counts at the edges (1 word, a perfect square, wider than the space), Tile size tiers, single-word counting, States per row from a recorded solve response, and the Answer's group.
- React components and pages have no unit tests, as elsewhere in the repo. They are checked by `bun run screenshot` (add both pages: top of page, light and dark, phone and desktop) and by running the app.
- `page-text.test.ts` keeps both languages' page text complete. `paths.test.ts` covers the new paths in both languages if paths are built through the path helper.

## Out of Scope

- The radial whole-tree picture from the video, and any whole-Solve-Tree figures such as colouring words by Guess Count or a group's average Guesses left. These need a new backend endpoint building the full tree and are left for a later spec.
- Letting the reader override the Guess at a deeper node (it would no longer be the Strategy's Solve Tree).
- Marking a Candidate's letters to show why it is in its group.
- A Widget form embedded in an Article.
- Hard Mode.
- Changes to the Step-through Game or Article 08's content beyond one Margin note.
- Thai translations of Articles 07 and 08.

## Further Notes

- The Opener Split page with Compare on shows about 4,600 words. Each word is one plain-text element, so rendering stays light. Look out for this when building `SplitGroups`.
- Building a whole Guess List / All words Solve Tree in Python takes about 8.5 s per Opener. This is why every view here is computed one node at a time from existing endpoints.
