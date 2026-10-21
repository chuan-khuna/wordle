# 04: The website reads the eight Strategies

**What to build:** The backend and the frontend use the new Strategy ids and the version 2 summary and Benchmark, and the website shows all eight Strategies where it used to show four.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Backend: `GET /api/guess-counts` accepts the eight ids (default `bits-guesses-all`), and the 400 message lists them. The Benchmark endpoints serve the eight Benchmarks
- [ ] Frontend: `OpenerDistribution` and `BenchmarkChart` default to the new ids and label the Strategies with the spec's display names. Their pickers group the Strategies by Ranking
- [ ] Frontend: `lib/opener-presets.ts` ranks are re-read for `bits-guesses-all`
- [ ] Frontend: Article 11 (Opener Distribution) uses the new ids, and its text names the Guess Pool and Search Scope where it says "Candidates only" or "all words"
- [ ] Frontend: other Articles that name a Strategy (the Benchmark and the "searching all words" one) use the glossary's Guess Pool and Search Scope
- [ ] Every Article and Widget that names a Strategy uses the glossary's terms (`<Term>` where the Article defines them)
- [ ] Tests: backend tests for the eight ids and an unknown id; `bun run build` passes (build-time Article validation)
- [ ] `bun run screenshot` checked by eye for the Benchmark chart and the Opener Distribution page
- [ ] Docs updated: `web-backend.md`, `web-frontend.md`, and the index summaries that name the four Strategies

See [spec](../spec.md).

## Comments
