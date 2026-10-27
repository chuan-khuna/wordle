# 07: Full run and measured cost

**What to build:** Run `just precompute-guess-counts` for all four Strategies over all 14,855 Openers on the developer's machine (hours for the two global Strategies), and record the real cost per thread count and the top Openers per Strategy in the Guess Count Matrix document. If threads scale badly for the global Strategies, open a follow-up ticket to run the work in processes behind the same option.

**Blocked by:** 06

**Status:** ready-for-human

- [ ] All four matrices complete and `summary.json` covers every Opener
- [ ] The document records the elapsed time, thread count and machine, and the top Openers per Strategy
- [ ] A follow-up ticket exists if the speed-up from threads is poor

See [spec](../spec.md).

## Comments
