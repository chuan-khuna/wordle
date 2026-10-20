import { MARK_NAMES } from "@/lib/feedback";
import { INLINE, PAINT, PLAIN, TILE } from "./letter-tile";

// Mark names as <Mark kind> spells them, to their Mark digit (0 Absent, 1 Present, 2 Correct).
const MARKS: Record<string, number> = { absent: 0, present: 1, correct: 2 };

/**
 * One letter in prose, drawn as a small tile like a letter of <Word>. `<Letter>e</Letter>` shows a plain tile;
 * `<Letter mark="present">e</Letter>` paints it with that Mark (`correct`, `present` or `absent`, as <Mark kind>).
 * Anything but one letter a to z, or an unknown mark, throws, which fails the build.
 */
export function Letter({ children, mark }: { children: string; mark?: string }) {
  const letter = String(children).trim().toLowerCase();
  if (!/^[a-z]$/.test(letter)) throw new Error(`<Letter>: "${children}" is not one letter a to z.`);
  const digit = mark === undefined ? undefined : MARKS[mark];
  if (mark !== undefined && digit === undefined) {
    throw new Error(`<Letter>${letter}</Letter>: unknown mark "${mark}". Use one of "correct", "present", "absent".`);
  }

  const label = digit === undefined ? letter.toUpperCase() : `${letter.toUpperCase()}, ${MARK_NAMES[digit]}`;
  return (
    <span role="img" aria-label={label} className={`inline-flex ${INLINE}`}>
      <span aria-hidden className={`${TILE} ${digit === undefined ? PLAIN : PAINT[digit]}`}>
        {letter}
      </span>
    </span>
  );
}
