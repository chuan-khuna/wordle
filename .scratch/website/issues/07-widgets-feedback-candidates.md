# Widgets: Feedback scorer and Candidate filter

Status: done
Blocked by: 03, 06

Build Widgets 1 and 2, with state taken from props and overridable from URL params. Tiles use the theme's `correct`, `present` and `absent` roles.

See [spec](../spec.md).

## Comments

Done. `FeedbackScorer` and `CandidateFilter` are in `app/frontend/src/components/widgets/`, registered in `mdx-components.tsx` and used in the two sample Articles. Props and URL params (`id`-namespaced as `<id>.<name>`) are documented in `docs/documents/web-frontend.md`. Marks are scored locally by a TS port (unit-tested, with a cross-check against `/api/feedback`); the API validates the words. No browser tool was available, so no screenshots.
