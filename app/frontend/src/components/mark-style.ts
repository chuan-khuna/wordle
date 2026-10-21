// Full class names, so Tailwind sees them. `text-ink-*` is the readable text colour for small type (tokens.css).
export const MARK_PAINT = {
  correct: "bg-correct text-ink-correct",
  present: "bg-present text-ink-present",
  absent: "bg-absent text-ink-absent",
} as const;

// A label, not a button: inline, tile radius, tight padding, small mono caps. leading-none keeps it from
// growing the prose line; the padding does not affect line height. cursor-help marks the card.
export const MARK_LABEL =
  "cursor-help rounded-md px-1.5 py-0.5 align-baseline font-mono text-xs leading-none font-semibold uppercase tracking-caps whitespace-nowrap";
