"use client";

import type { SplitGroup } from "@/lib/api";
import { parseMarks } from "@/lib/wordle/feedback";
import { pageText } from "@/lib/i18n/page-text";
import { barPercent, formatLeft, orderGroups, percent } from "@/lib/widgets/split-chart";
import { Tile } from "./Tile";

const WIN = "22222";

/**
 * The Feedback Split as horizontal bars, like the gpui app's Solver chart: one button per Feedback,
 * biggest first, every group drawn, in a box that scrolls past about 320px (the explorer's right column matches its height). Plain elements and tokens,
 * no chart library. Each row is the Feedback as five small Mark tiles, a bar as long as the group
 * (relative to the largest), and the figures: words left and the chance of the Feedback.
 * Its words are `text`'s (the page text table; English by default, as in the Feedback Split explorer).
 */
export function SplitChart({
  word,
  groups,
  candidates,
  expectedCandidates,
  bits,
  selected,
  onSelect,
  text = pageText("en"),
}: {
  word: string;
  groups: readonly SplitGroup[];
  candidates: number;
  expectedCandidates: number;
  bits: number;
  selected: string | null;
  onSelect: (marks: string) => void;
  text?: ReturnType<typeof pageText>;
}) {
  const ordered = orderGroups(groups);
  const largest = ordered[0]?.count ?? 0;
  // The count column is as wide as the largest count (at least three digits), so a four-digit group does not run into "words".
  const countDigits = Math.max(3, String(largest).length);
  const title = text.chartTitle(formatLeft(expectedCandidates), bits.toFixed(2));

  return (
    <figure className="min-w-0">
      <figcaption>
        <p className="text-base text-text">{title}</p>
        <p className="mt-0.5 text-xs text-meta">
          {text.chartSummary(ordered.length, candidates)}
        </p>
      </figcaption>
      <ul
        aria-label={text.chartListLabel(word)}
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
                aria-label={`${text.feedbackLabel} ${g.marks}, ${text.words(g.count)}`}
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
                  <span className="text-right text-text" style={{ minWidth: `${countDigits}ch` }}>
                    {g.count}
                  </span>
                  <span className="w-[5ch] text-meta max-sm:hidden">{text.wordUnit(g.count)}</span>
                  <span className="text-meta max-sm:hidden">·</span>
                  <span className="w-[5ch] text-right text-meta">{percent(g.count, candidates)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-meta">{text.chartHint}</p>
    </figure>
  );
}
