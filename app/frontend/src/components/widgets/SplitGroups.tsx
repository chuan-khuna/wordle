"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SplitResponse } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { parseMarks } from "@/lib/wordle/feedback";
import { type HeadSize, columnCount, headSize, orderSplitGroups } from "@/lib/widgets/split-groups";
import { Tile } from "./Tile";

/** A word is five mono capitals at 11px (about 6.6px each), in a grid column of `WORD_W` pixels; columns are `WORD_GAP` apart. */
const WORD_W = 38;
const WORD_GAP = 8;
/** What a block adds around its grid: 6px of padding each side, plus 3px each side for the highlight outline. */
const BLOCK_EXTRA = 2 * 6 + 2 * 3;
/** Columns assumed until the container has been measured. */
const FALLBACK_COLUMNS = 12;

const HEAD_TILE: Record<HeadSize, { small?: boolean; board?: boolean; tiny?: boolean }> = {
  lg: {},
  md: { small: true },
  sm: { board: true },
  xs: { tiny: true },
};

const columnsIn = (width: number) => Math.max(1, Math.floor((width - BLOCK_EXTRA + WORD_GAP) / (WORD_W + WORD_GAP)));

/** How many word columns fit in the container's width, or in `layoutWidth` when given (at least 1), kept up to date as it resizes. */
function useColumns(layoutWidth?: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(FALLBACK_COLUMNS);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || layoutWidth !== undefined) return;
    const measure = () => setColumns(columnsIn(el.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layoutWidth]);
  return [ref, layoutWidth === undefined ? columns : columnsIn(layoutWidth)];
}

/**
 * The Feedback Split of one Guess over a Candidate Set with every word shown, as in the video: one block per
 * Feedback, biggest first, flowing left to right and wrapping. A block's head is the Guess with that Feedback's five
 * Marks (smaller Tiles for a smaller group) and the group's word count; under it the group's words, alphabetical, as
 * plain text (no Tiles, no Mark colours), in about √n columns (never more than fit). A word is one text element, so the ~2,315 words
 * of a whole Answer List stay light.
 * `highlightCode` outlines one group and `highlightWord` draws one word as strong text.
 */
export const SplitGroups = memo(function SplitGroups({
  split,
  lang = DEFAULT_LANGUAGE,
  highlightCode,
  highlightWord,
  layoutWidth,
}: {
  split: SplitResponse;
  lang?: Language;
  highlightCode?: number;
  highlightWord?: string;
  /** Lay the blocks out as if the container were this wide (in pixels), instead of measuring it (the Opener Split's fit mode). */
  layoutWidth?: number;
}) {
  const text = pageText(lang);
  const groups = useMemo(() => orderSplitGroups(split.split), [split.split]);
  const [ref, available] = useColumns(layoutWidth);
  const guess = split.word;

  return (
    <div ref={ref} className="min-w-0 font-sans" style={layoutWidth === undefined ? undefined : { width: layoutWidth }}>
      <ul aria-label={text.splitGroupsLabel(guess)} className="flex flex-wrap items-start gap-x-5 gap-y-6">
        {groups.map((g) => {
          const marks = parseMarks(g.marks) ?? [];
          const size = HEAD_TILE[headSize(g.count)];
          const cols = columnCount(g.count, available);
          return (
            <li
              key={g.marks}
              data-marks={g.marks}
              aria-current={g.code === highlightCode ? "true" : undefined}
              className={`max-w-full rounded-md p-1.5 ${g.code === highlightCode ? "outline-2 outline-offset-1 outline-accent" : ""}`}
            >
              <div role="group" aria-label={`${text.feedbackLabel} ${g.marks}, ${text.words(g.count)}`}>
                <div className="flex gap-0.5" aria-hidden="true">
                  {Array.from(guess, (letter, i) => (
                    <Tile key={i} letter={letter} mark={marks[i] ?? 0} {...size} />
                  ))}
                </div>
                <p className="mt-1 text-xs text-meta tabular-nums">{text.words(g.count)}</p>
              </div>
              <ul
                className="mt-2 grid"
                style={{ gridTemplateColumns: `repeat(${cols}, ${WORD_W}px)`, gap: WORD_GAP }}
              >
                {g.words.map((w) => (
                  <li key={w}>
                    <WordText word={w} strong={w === highlightWord} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

/** One word as plain mono text (no Mark colours); `strong` is the highlighted word. */
function WordText({ word, strong }: { word: string; strong: boolean }) {
  return (
    <span className={`block font-mono text-[11px] leading-5 uppercase ${strong ? "font-bold text-text" : "text-meta"}`}>
      {word}
    </span>
  );
}
