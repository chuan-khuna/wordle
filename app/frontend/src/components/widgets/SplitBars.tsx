"use client";

import { useState } from "react";
import type { SplitResponse } from "@/lib/api";
import { pageText } from "@/lib/i18n/page-text";
import { orderGroups } from "@/lib/widgets/split-chart";
import { SplitChart } from "./SplitChart";
import { SplitWords } from "./SplitWords";

/**
 * A Feedback Split as the explorer shows it: the bar chart (one bar per Feedback, biggest first) beside the words of the
 * selected Feedback, stacked when the container is narrower than `@2xl` (672px of its own width, a container query). The biggest group is selected
 * to begin with and again whenever `data` is a new response. Shared by the Feedback Split explorer and the Opener Split
 * page's Bars view; `text` is the page text (English by default) and `wordLink` turns the words into links.
 */
export function SplitBars({
  data,
  text = pageText("en"),
  wordLink,
}: {
  data: SplitResponse;
  text?: ReturnType<typeof pageText>;
  wordLink?: (word: string) => string;
}) {
  // The pick is kept with the response it was made on, so a new response starts again from its biggest group.
  const [pick, setPick] = useState<{ data: SplitResponse; marks: string } | null>(null);
  const picked = pick?.data === data ? pick.marks : (orderGroups(data.split)[0]?.marks ?? null);
  const group = data.split.find((s) => s.marks === picked) ?? null;
  return (
    <div className="@container">
      <div className="grid gap-x-8 gap-y-6 @2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SplitChart
          word={data.word}
          groups={data.split}
          candidates={data.candidates}
          expectedCandidates={data.expected_candidates}
          bits={data.bits}
          selected={picked}
          onSelect={(marks) => setPick({ data, marks })}
          text={text}
        />
        <div className="flex min-w-0 flex-col @2xl:relative">
          <div className="flex min-h-0 flex-1 flex-col @2xl:absolute @2xl:inset-0">
            <SplitWords key={group?.marks ?? ""} word={data.word} group={group} candidates={data.candidates} text={text} wordLink={wordLink} />
          </div>
        </div>
      </div>
    </div>
  );
}
