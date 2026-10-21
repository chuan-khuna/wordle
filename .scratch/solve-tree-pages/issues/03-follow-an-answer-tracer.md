# 03: Follow an Answer tracer: an Opener for `/api/solve`, through to the page

**What to build:** A reader follows a new "Follow an Answer" link under Explore and picks:

- an Answer;
- a Strategy, with the same Guess Pool, Search Scope and Ranking buttons as elsewhere;
- an Opener, by default the Strategy's best, though any Guess Pool word may be typed.

The page shows the Game one row at a time. Row k is `SplitGroups` of Guess k over the Candidate Set before it, with the Answer's group outlined and the Answer highlighted. A sticky strip of the Guesses and their Feedback lets the reader jump to any row, and Prev and Next step through them. The last row is the Win. The Step-through Game and Article 08 are unchanged. See [the spec](../spec.md).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `GET /api/solve` takes an optional `opener`. When given, it must be on the Strategy's Guess Pool (else 400) and is Guess 1. The later Guesses come from the Strategy. Step 1's alternatives are still the Strategy's top Suggestions. Without `opener` the response is unchanged.
- [ ] Backend tests go through the HTTP endpoint, next to the existing solve tests. They cover: the Opener becomes Guess 1, the Game ends in a Win, a word off the Guess Pool gets 400, an Answer equal to the Opener is a one-Guess Game, and no `opener` gives the same Game as before.
- [ ] The split-groups module turns a solve response into one State per row (the Guesses before it) and finds the Answer's group in a row's split. `bun test` covers both with a recorded solve response.
- [ ] The page calls `/api/solve` once, then `POST /api/split` for each row it shows.
- [ ] `/follow` and `/th/follow` take URL params `answer`, `pool`, `scope`, `by`, `opener` and `step`. A word off the Answer List, or an Opener off the Guess Pool, shows the API's message.
- [ ] The Guess strip stays in view while the row scrolls, and shows each Guess with its Feedback Marks. The current row is marked. Clicking a Guess, or Prev and Next, changes `step`.
- [ ] The Explore heading lists Opener Distribution, Opener Split, then Follow an Answer, in the sidebar and the phone menu. Page text exists in English and Thai.
- [ ] `bun run screenshot` includes the page at step 1 and at a later step.
- [ ] `web-backend.md`, `web-frontend.md` and their `INDEX.md` summaries describe the `opener` param and the page.
