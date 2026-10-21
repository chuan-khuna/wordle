"use client";

import type { SplitGroup } from "@/lib/api";
import { parseMarks } from "@/lib/feedback";
import { barPercent, chartTitle, orderGroups, percent, wordsText } from "@/lib/split-chart";
import { Tile } from "./Tile";

const WIN = "22222";

/**
 * The Feedback Split as horizontal bars, like the gpui app's Solver chart: one button per Feedback,
 * biggest first, every group drawn, in a box that scrolls past about 320px (the explorer's right column matches its height). Plain elements and tokens,
 * no chart library. Each row is the Feedback as five small Mark tiles, a bar as long as the group
 * (relative to the largest), and the figures: words left and the chance of the Feedback.
 */
export function SplitChart({
  word,
  groups,
  candidates,
  expectedCandidates,
  bits,
  selected,
  onSelect,
}: {
  word: string;
  groups: readonly SplitGroup[];
  candidates: number;
  expectedCandidates: number;
  bits: number;
  selected: string | null;
  onSelect: (marks: string) => void;
}) {
  const ordered = orderGroups(groups);
  const largest = ordered[0]?.count ?? 0;
  const title = chartTitle(expectedCandidates, bits);

  return (
    <figure className="min-w-0">
      <figcaption>
        <p className="text-base text-text">{title}</p>
        <p className="mt-0.5 text-xs text-meta">
          {ordered.length} Feedbacks over {candidates} Candidates
        </p>
      </figcaption>
      <ul
        aria-label={`Feedback Split of ${word}: words left per Feedback`}
        className="mt-3 flex max-h-80 flex-col gap-px overflow-y-auto overscroll-contain border-y border-rule py-1"
      >
        {ordered.map((g) => {
          const marks = parseMarks(g.marks) ?? [];
          const on = g.marks === selected;
          const win = g.marks === WIN;
          return (
            <li key={g.marks}>
              <button
                type="button"
                data-marks={g.marks}
                aria-pressed={on}
                aria-label={`Feedback ${g.marks}, ${wordsText(g.count)}`}
                onClick={() => onSelect(g.marks)}
                className={`grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 rounded-sm px-1.5 py-0.5 text-left hover:bg-highlight-low focus-visible:-outline-offset-2 sm:gap-3 ${on ? "bg-highlight-med" : ""}`}
              >
                <span className="flex gap-0.5" aria-hidden>
                  {marks.map((m, i) => (
                    <Tile key={i} tiny letter={word[i] ?? ""} mark={m} />
                  ))}
                </span>
                <span className="block h-3 min-w-0" aria-hidden>
                  <span
                    className={`block h-full rounded-sm ${win ? "bg-correct" : on ? "bg-heading" : "bg-subtle"}`}
                    style={{ width: `${barPercent(g.count, largest)}%`, minWidth: 3 }}
                  />
                </span>
                <span className="flex items-baseline justify-end gap-2 text-xs tabular-nums" aria-hidden>
                  <span className="w-[3ch] text-right text-text">{g.count}</span>
                  <span className="w-[5ch] text-meta max-sm:hidden">{g.count === 1 ? "word" : "words"}</span>
                  <span className="text-meta max-sm:hidden">·</span>
                  <span className="w-[5ch] text-right text-meta">{percent(g.count, candidates)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-meta">
        Each bar is a Feedback (0 Absent, 1 Present, 2 Correct), as long as the words that would remain. Select one to see them.
      </p>
    </figure>
  );
}
