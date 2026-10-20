// The small letter tiles <Word> and <Letter> draw in prose. Full class names, so Tailwind sees them.

// Mono caps on the tile radius, sized in em so a tile does not grow the prose line.
export const TILE =
  "inline-flex h-[1.45em] w-[1.3em] items-center justify-center rounded-sm font-mono text-[0.72em] leading-none font-semibold uppercase";

// A tile with no Mark: a quiet hairline frame, the rule colour the page uses for its dividers.
export const PLAIN = "border border-rule text-text";

// A tile painted with its Mark, by Mark digit (0 Absent, 1 Present, 2 Correct). `text-ink-*` is the readable text
// colour for small type (tokens.css), as <Mark> uses.
export const PAINT = ["bg-absent text-ink-absent", "bg-present text-ink-present", "bg-correct text-ink-correct"] as const;

// Centred on the line, so the text beside the tiles keeps its baseline.
export const INLINE = "align-middle whitespace-nowrap";
