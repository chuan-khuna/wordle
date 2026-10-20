import { MARK_NAMES, type Mark } from "@/lib/feedback";

const PAINT = ["bg-absent text-on-absent", "bg-present text-on-present", "bg-correct text-on-correct"] as const;
const BASE =
  "inline-flex h-12 w-12 items-center justify-center rounded-md text-2xl font-bold uppercase select-none sm:h-14 sm:w-14";

const SMALL = "inline-flex h-8 w-8 items-center justify-center rounded text-base font-bold uppercase select-none";

/** A letter tile painted with its Mark's theme role. Pass `onCycle` to make it a button that steps through the Marks. */
export function Tile({
  letter,
  mark,
  onCycle,
  small,
}: {
  letter: string;
  mark: Mark;
  onCycle?: () => void;
  small?: boolean;
}) {
  const base = small ? SMALL : BASE;
  const label = `${letter || "empty"}: ${MARK_NAMES[mark]}`;
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
      aria-label={`${label}. Press to change the Mark.`}
      title={MARK_NAMES[mark]}
      className={`${base} ${PAINT[mark]} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {letter || "·"}
    </button>
  );
}
