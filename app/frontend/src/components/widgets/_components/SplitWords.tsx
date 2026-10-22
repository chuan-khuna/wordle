"use client";

import Link from "next/link";
import { useState } from "react";
import type { SplitGroup } from "@/lib/api";
import { pageText } from "@/lib/i18n/page-text";
import { percent } from "@/lib/widgets/split-chart";
import { parseMarks } from "@/lib/wordle/feedback";
import { Tile } from "./Tile";
import { useHoverCard } from "./useHoverCard";

/** The word button under an event target, if any. */
const wordOf = (target: EventTarget | null) => (target as HTMLElement | null)?.closest?.<HTMLElement>("[data-word]") ?? null;

/**
 * The right column of the Split explorer: the selected Feedback as the Guess's five Marks, how many words
 * are left, the chance of that Feedback, and every one of its words in a compact mono grid that scrolls inside the column.
 * Its words are `text`'s (English by default). With `wordLink` each word is a button that opens the same card as in
 * `SplitGroups` (the word and a "Follow this Answer" link to `wordLink(word)`), the words one tab stop with arrow-key roving
 * focus (Left and Right by a word, Up and Down by a row, Home and End).
 */
export function SplitWords({
  word,
  group,
  candidates,
  text = pageText("en"),
  wordLink,
}: {
  word: string;
  group: SplitGroup | null;
  candidates: number;
  text?: ReturnType<typeof pageText>;
  wordLink?: (word: string) => string;
}) {
  const linked = wordLink !== undefined;
  const [focused, setFocused] = useState<string | null>(null);
  const card = useHoverCard({
    selector: "[data-word]",
    enabled: linked,
    resetKey: group,
    interactive: true,
    label: (el) => el.dataset.word ?? "",
    children: (el) =>
      wordLink && (
        <>
          <p className="font-mono text-base font-bold tracking-widest text-text uppercase">{el.dataset.word}</p>
          <Link href={wordLink(el.dataset.word!)} className="text-accent underline underline-offset-2">
            {text.followThisAnswer}
          </Link>
        </>
      ),
  });
  if (!group) return <p className="text-meta">{text.chartPick}</p>;
  const marks = parseMarks(group.marks) ?? [];
  const tabWord = focused !== null && group.words.includes(focused) ? focused : group.words[0];

  const roam = (el: HTMLElement, key: string): HTMLElement | null => {
    const list = el.closest("ul")!;
    const all = [...list.querySelectorAll<HTMLElement>("[data-word]")];
    const at = all.indexOf(el);
    // The grid is auto-fill, so its column count is whatever the browser made of it.
    const cols = getComputedStyle(list).gridTemplateColumns.split(" ").length || 1;
    switch (key) {
      case "ArrowRight":
        return all[at + 1] ?? null;
      case "ArrowLeft":
        return all[at - 1] ?? null;
      case "ArrowDown":
        return all[at + cols] ?? null;
      case "ArrowUp":
        return all[at - cols] ?? null;
      case "Home":
        return all[0] ?? null;
      case "End":
        return all.at(-1) ?? null;
    }
    return null;
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-live="polite"
      {...card.handlers}
      {...(linked && {
        onFocus: (e: React.FocusEvent) => {
          const el = wordOf(e.target);
          if (el) setFocused(el.dataset.word!);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          const el = wordOf(e.target);
          if (!el || e.altKey || e.ctrlKey || e.metaKey) return;
          const next = roam(el, e.key);
          if (!next) return;
          e.preventDefault();
          next.focus();
        },
      })}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex gap-1" role="img" aria-label={`${text.feedbackLabel} ${group.marks}`}>
          {marks.map((m, i) => (
            <Tile key={i} small letter={word[i] ?? ""} mark={m} />
          ))}
        </span>
        <p className="text-base whitespace-nowrap text-text">{text.chartLeft(group.count)}</p>
      </div>
      <p className="mt-1.5 text-xs text-meta">{text.chartChance(percent(group.count, candidates), group.count)}</p>
      <ul className="mt-3 grid max-h-64 min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(6ch,1fr))] content-start gap-x-2 gap-y-1 overflow-y-auto overscroll-contain border-y border-rule py-2 font-mono text-sm uppercase uppercase @2xl:max-h-none">
        {group.words.map((w) => (
          <li key={w}>
            {linked ? (
              <button
                type="button"
                data-word={w}
                tabIndex={w === tabWord ? 0 : -1}
                aria-haspopup="dialog"
                className="block w-full cursor-pointer rounded-xs text-left uppercase hover:text-heading focus-visible:outline-2 focus-visible:outline-accent"
              >
                {w}
              </button>
            ) : (
              w
            )}
          </li>
        ))}
      </ul>
      {card.node}
    </div>
  );
}
