# Write the "Solving Wordle" Series

Status: done
Blocked by: 08, 09, 15, 16

Write the full text of the ten Articles, the two Parts and the Series page listed in the spec, into the files ticket 16 laid out. They are the user's video script, so an agent drafts them and the user edits and approves the wording.

Each Article explains its one idea in plain English, in glossary terms (with `<Term>` where a reader may need the definition, and `<Mark>` labels whenever the prose names Correct, Present or Absent), uses its Widget from the spec with a starting state that makes the point, and shows short Python that implements the idea, taken from or faithful to `packages/wordle` (for example the two-pass Feedback rule, filtering Candidates, building a Feedback Split, the bits formula, the greedy choice). Numbers quoted in the prose (Candidate Set sizes, bits, Openers, Benchmark results) come from running this repo's code, not from memory. Article 10 (Greedy vs optimal) cites the true optimum from a primary source and does not compute it. Add "Expected Candidates" to `GLOSSARY.md` if the Articles need it as a `<Term>`. Leave the Series `video` and Article `video` times out until the user has a video.

Article 04 carries the maths in the spec: Expected Candidates and Expected Information as two expectations over the same Feedback Split, with the formulas in KaTeX and the shared idea stated plainly. Add "Expected Candidates" to `GLOSSARY.md` (it is needed here).

See [spec](../spec.md).

## Comments

Done. First draft of the Series page, both Part intros and all ten Articles, with Widgets, Python excerpts and the maths of Article 04. The wording awaits the user's edit. Every number was run from this repo's code or API and is logged in the ticket's scratch numbers log; the optimum in Article 10 is cited from Alex Selby's write-up (SALET, 3.4212, 7,920 guesses). "Expected Candidates" added to `GLOSSARY.md`. Prose names words with `<Word>`.
