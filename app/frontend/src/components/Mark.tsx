import { TermTip } from "@/components/TermTip";
import { lookupMark } from "@/lib/glossary";

// Full class names, so Tailwind sees them. `text-ink-*` is the readable text colour for small type (tokens.css).
const PAINT = {
  correct: "bg-correct text-ink-correct",
  present: "bg-present text-ink-present",
  absent: "bg-absent text-ink-absent",
} as const;

// A label, not a button: inline, tile radius, tight padding, small mono caps. leading-none keeps it from
// growing the prose line; the padding does not affect line height. cursor-help marks the tooltip.
const LABEL = "cursor-help rounded-md px-1.5 py-0.5 align-baseline font-mono text-xs leading-none font-semibold uppercase tracking-caps whitespace-nowrap";

/**
 * A Mark's name in prose, on that Mark's tile colours, with the Mark's definition from GLOSSARY.md on
 * hover, keyboard focus or tap (the same tooltip as <Term>). `<Mark kind="correct" />` shows "Correct";
 * children replace the text: `<Mark kind="present">Present letters</Mark>`. An unknown kind throws, which fails the build.
 */
export function Mark({ kind, children }: { kind: string; children?: React.ReactNode }) {
  const { name, definition } = lookupMark(kind);
  return (
    <TermTip term={name} definition={definition} className={`${LABEL} ${PAINT[kind as keyof typeof PAINT]}`}>
      {children ?? name}
    </TermTip>
  );
}
