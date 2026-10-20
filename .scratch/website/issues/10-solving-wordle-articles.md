# Write the "Solving Wordle" Series

Status: ready-for-agent
Blocked by: 08, 09, 15

Write the eight Articles and the Series page listed in the spec, and delete all the `sample-` content. They are the user's video script, so an agent drafts them and the user edits and approves the wording.

Each Article explains its one idea in plain English, in glossary terms (with `<Term>` where a reader may need the definition), uses its Widget from the spec with a starting state that makes the point, and shows short Python that implements the idea, taken from or faithful to `packages/wordle` (for example the two-pass Feedback rule, filtering Candidates, building a Feedback Split, the bits formula, the greedy choice). Numbers quoted in the prose (Candidate Set sizes, bits, Openers, Benchmark results) come from running this repo's code, not from memory. Article 8 cites the true optimum from a primary source and does not compute it. Add "Expected Candidates" to `GLOSSARY.md` if the Articles need it as a `<Term>`. Leave the Series `video` and Article `video` times out until the user has a video.

See [spec](../spec.md).
