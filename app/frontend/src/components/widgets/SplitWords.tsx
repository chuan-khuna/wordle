"use client";

import type { SplitGroup } from "@/lib/api";
import { parseMarks } from "@/lib/wordle/feedback";
import { chanceSentence, wordsText } from "@/lib/widgets/split-chart";
import { Tile } from "./Tile";

/**
 * The right column of the Split explorer: the selected Feedback as the Guess's five Marks, how many words
 * are left, the chance of that Feedback, and every one of its words in a compact mono grid that scrolls inside the column.
 */
export function SplitWords({ word, group, candidates }: { word: string; group: SplitGroup | null; candidates: number }) {
  if (!group) return <p className="text-meta">Select a bar to see the words that would remain.</p>;
  const marks = parseMarks(group.marks) ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex gap-1" role="img" aria-label={`Feedback ${group.marks}`}>
          {marks.map((m, i) => (
            <Tile key={i} small letter={word[i] ?? ""} mark={m} />
          ))}
        </span>
        <p className="text-base whitespace-nowrap text-text">{wordsText(group.count)} left</p>
      </div>
      <p className="mt-1.5 text-xs text-meta">{chanceSentence(group.count, candidates)}</p>
      <ul className="mt-3 grid max-h-64 min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(6ch,1fr))] content-start gap-x-2 gap-y-1 overflow-y-auto overscroll-contain border-y border-rule py-2 font-mono text-sm uppercase uppercase @2xl:max-h-none">
        {group.words.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
