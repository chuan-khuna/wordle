# 04: The website reads the eight Strategies

**What to build:** The backend and the frontend use the new Strategy ids and the version 2 summary and Benchmark, and the website shows all eight Strategies where it used to show four.

**Blocked by:** 01

**Status:** done

- [x] Backend: `GET /api/guess-counts` accepts the eight ids (default `bits-guesses-all`), and the 400 message lists them. The Benchmark endpoints serve the eight Benchmarks
- [x] Frontend: `OpenerDistribution` and `BenchmarkChart` default to the new ids and label the Strategies with the spec's display names. Their pickers group the Strategies by Ranking
- [x] Frontend: `lib/opener-presets.ts` ranks are re-read for `bits-guesses-all`
- [x] Frontend: Article 11 (Opener Distribution) uses the new ids, and its text names the Guess Pool and Search Scope where it says "Candidates only" or "all words"
- [x] Frontend: other Articles that name a Strategy (the Benchmark and the "searching all words" one) use the glossary's Guess Pool and Search Scope
- [x] Every Article and Widget that names a Strategy uses the glossary's terms (`<Term>` where the Article defines them)
- [x] Tests: backend tests for the eight ids and an unknown id; `bun run build` passes (build-time Article validation)
- [ ] `bun run screenshot` checked by eye for the Benchmark chart and the Opener Distribution page
- [x] Docs updated: `web-backend.md`, `web-frontend.md`, and the index summaries that name the four Strategies

See [spec](../spec.md).

## Comments

- Done. Backend: `GET /api/guess-counts` defaults to `bits-guesses-all`, rejects any other id (the old version 1 ids too) with a 400 listing the eight, and gives `total_rows` as the size of the Strategy's Guess Pool (2,315 for an Answer List Strategy). `/api/benchmark` serves `benchmark.json` as it is; its test now plays all eight Strategies on 12 Answers and checks their order. Frontend: one shared list of the eight in `src/lib/strategies.ts` (ids, display names, names of each choice, groups by Ranking; `strategies.test.ts`). `OpenerDistribution` defaults to `bits-guesses-all` and its Select has one group per Ranking (items "Guess List, All words", the trigger the whole name). `BenchmarkChart` defaults to all eight and gained a checkbox picker, one fieldset per Ranking. `opener-presets.ts` ranks were renamed to `bits-guesses-all`, not recomputed (same matrix). Articles 08, 09, 10 and 11 use the glossary's Guess Pool and Search Scope names; 08 and 09 add `<Term>`s for Guess Pool, Search Scope and Ranking.
- Decisions the ticket left open: (1) `/api/solve` (the Step-through Game) now ranks its first Guess over the whole Guess Pool under either Search Scope, as the Benchmark does, so Guess List with Candidates only opens with `tarse`; Article 08's two Games are unchanged. `/api/suggestions` is left as it is (it ranks what the State and Search Scope ask for). (2) The Benchmark chart colours by Guess Pool and Search Scope (four theme roles), with Expected Candidates a half tint of the same role, instead of eight unrelated colours; the legend list above the chart was dropped since the picker carries the swatches and the table names each Strategy. The last ticked checkbox can't be unticked. (3) The Step-through Game's pickers are now labelled Guess Pool, Search Scope and Ranking. (4) Article 09 gains one paragraph on the four new Strategies, with numbers from an eight-Strategy Benchmark run into a scratch folder (the four old Strategies' results are unchanged): Answer List with All words never loses (3.495 and 3.520), Guess List with Candidates only still loses 6 and 13.
- Not done: `bun run screenshot` could not run, because the `playwright` package (in `package.json` and `bun.lock`) is not in `node_modules`, and it was not installed. The same missing module makes `bun run build` fail type checking in `scripts/screenshot.ts`; with that one file moved aside the build passes, Article validation included. The real `precompute-cache/` is still version 1, so the live site shows 503s for `/api/guess-counts` until ticket 05, and the Benchmark chart shows four Strategies until `just precompute-benchmark` runs again.
