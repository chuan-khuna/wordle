import type { pageText } from "@/lib/i18n/page-text";
import { type HeadSize, headSize } from "@/lib/widgets/split-groups";
import { parseMarks } from "@/lib/wordle/feedback";
import { Tile } from "./Tile";

/** A word is five mono capitals at 11px (about 6.6px each), in a grid column of `WORD_W` pixels; columns are `WORD_GAP` apart. */
export const WORD_W = 38;
export const WORD_GAP = 8;

const HEAD_TILE: Record<HeadSize, { small?: boolean; board?: boolean; tiny?: boolean }> = {
  lg: {},
  md: { small: true },
  sm: { board: true },
  xs: { tiny: true },
};

/**
 * The inside of one Feedback's block, shared by `SplitGroups` and the Follow an Answer path: the head (the Guess in that
 * Feedback's Marks, smaller Tiles for a smaller group, and the word count, or `label` in its place) and the group's words as
 * plain text in `columns` columns. `more` words left out are counted after them. `strong` marks the highlighted word.
 */
export function SplitBlock({
  marks: code,
  count,
  words,
  guess,
  columns,
  text,
  label,
  more = 0,
  highlightWord,
  linked = false,
  picked = null,
  tabWord = null,
}: {
  marks: string;
  count: number;
  words: readonly string[];
  guess: string;
  columns: number;
  text: ReturnType<typeof pageText>;
  label?: string;
  more?: number;
  highlightWord?: string;
  linked?: boolean;
  /** The picked word, when it is in this block. */
  picked?: string | null;
  /** The word that is the tab stop, when it is in this block. */
  tabWord?: string | null;
}) {
  const marks = parseMarks(code) ?? [];
  const size = HEAD_TILE[headSize(count)];
  return (
    <>
      <div role="group" aria-label={`${text.feedbackLabel} ${code}, ${text.words(count)}`}>
        <div className="flex gap-0.5" aria-hidden="true">
          {Array.from(guess, (letter, i) => (
            <Tile key={i} letter={letter} mark={marks[i] ?? 0} {...size} />
          ))}
        </div>
        <p className="mt-1 text-xs text-meta tabular-nums">{label ?? text.words(count)}</p>
      </div>
      <ul
        data-cols={columns}
        className="mt-2 grid"
        style={{ gridTemplateColumns: `repeat(${columns}, ${WORD_W}px)`, gap: WORD_GAP }}
      >
        {words.map((w) => (
          <li key={w}>
            <WordText word={w} strong={w === highlightWord || w === picked} linked={linked} tabbable={w === tabWord} />
          </li>
        ))}
      </ul>
      {more > 0 && <p className="mt-1 text-[11px] leading-5 text-meta">{text.pathMore(more)}</p>}
    </>
  );
}

/** One word as plain mono text (no Mark colours); `strong` is the highlighted word. Linked, it is a button (only the tab stop is in the Tab order). */
function WordText({ word, strong, linked, tabbable }: { word: string; strong: boolean; linked: boolean; tabbable: boolean }) {
  const look = `block font-mono text-[11px] leading-5 uppercase ${strong ? "font-bold text-text" : "text-meta"}`;
  if (!linked) return <span className={look}>{word}</span>;
  return (
    <button
      type="button"
      data-word={word}
      tabIndex={tabbable ? 0 : -1}
      aria-haspopup="dialog"
      className={`${look} w-full cursor-pointer rounded-xs text-left hover:text-text focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {word}
    </button>
  );
}
