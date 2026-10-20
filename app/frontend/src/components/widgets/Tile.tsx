import { MARK_NAMES, type Mark } from "@/lib/feedback";

const PAINT = ["bg-absent text-on-absent", "bg-present text-on-present", "bg-correct text-on-correct"] as const;
const BASE =
  "inline-flex h-12 w-12 items-center justify-center rounded-md font-mono text-2xl font-semibold uppercase select-none sm:h-14 sm:w-14";

const SMALL = "inline-flex h-8 w-8 items-center justify-center rounded-sm font-mono text-sm font-semibold uppercase select-none";

const TINY = "inline-flex h-4 w-4 items-center justify-center rounded-[2px] font-mono text-[10px] leading-none font-semibold uppercase select-none";

/** A letter tile painted with its Mark's theme role. Pass `onCycle` to make it a button that steps through the Marks. */
export function Tile({
  letter,
  mark,
  onCycle,
  small,
  tiny,
}: {
  letter: string;
  mark: Mark;
  onCycle?: () => void;
  small?: boolean;
  /** The 16px tile used as a chart label. */
  tiny?: boolean;
}) {
  const base = tiny ? TINY : small ? SMALL : BASE;
  const label = `${letter ? letter.toUpperCase() : "Empty"}, ${MARK_NAMES[mark]}`;
  if (!onCycle) {
    return (
      <span className={`${base} ${PAINT[mark]}`} role="img" aria-label={label}>
        {letter}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={label}
      title={`${MARK_NAMES[mark]}: click to change`}
      className={`${base} ${PAINT[mark]} cursor-pointer`}
    >
      {letter || "·"}
    </button>
  );
}
