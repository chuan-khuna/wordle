"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SplitGroup } from "@/lib/api";
import { parseMarks } from "@/lib/feedback";
import { chanceSentence, wordsText } from "@/lib/split-chart";
import { Tile } from "./Tile";

const WORDS_SHOWN = 60;

/**
 * The right column of the Split explorer: the selected Feedback as the Guess's five Marks, how many words
 * are left, the chance of that Feedback, and the words in a compact mono grid that scrolls inside the column.
 * Remount it (key) per selection so "Show all" resets.
 */
export function SplitWords({ word, group, candidates }: { word: string; group: SplitGroup | null; candidates: number }) {
  const [all, setAll] = useState(false);
  if (!group) return <p className="text-meta">Select a bar to see the words that would remain.</p>;
  const marks = parseMarks(group.marks) ?? [];
  const words = all ? group.words : group.words.slice(0, WORDS_SHOWN);
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
      <p className="mt-1.5 text-xs text-meta">
        <span className="font-mono text-text">{group.marks}</span>: {chanceSentence(group.count, candidates)}
      </p>
      <ul className="mt-3 grid max-h-64 min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(6ch,1fr))] content-start gap-x-2 gap-y-1 overflow-y-auto overscroll-contain border-y border-rule py-2 font-mono text-sm @2xl:max-h-none">
        {words.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      {group.count > WORDS_SHOWN && (
        <Button type="button" onClick={() => setAll((s) => !s)} aria-expanded={all} className="mt-2 self-start">
          {all ? "Show fewer" : `Show all ${group.count}`}
        </Button>
      )}
    </div>
  );
}
