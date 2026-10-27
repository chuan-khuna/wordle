"use client";

import Link from "next/link";
import { memo, useMemo, useState } from "react";
import type { SplitResponse } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { columnCount, orderSplitGroups } from "@/lib/widgets/split-groups";
import { HEAD, useHeadCard } from "./HeadCard";
import { SplitBlock, useColumns } from "./SplitBlock";
import { chain, useHoverCard } from "./useHoverCard";

/** What a block adds around its grid: 6px of padding each side, plus 3px each side for the highlight outline. */
const BLOCK_EXTRA = 2 * 6 + 2 * 3;

type OrderedGroup = ReturnType<typeof orderSplitGroups>[number];

/** The word button under an event target, if any (words are found by delegation, not by a handler each). */
const wordOf = (target: EventTarget | null) => (target as HTMLElement | null)?.closest?.<HTMLElement>("[data-word]") ?? null;
/** The block head under an event target, if any. */
const headOf = (target: EventTarget | null) => (target as HTMLElement | null)?.closest?.<HTMLElement>(HEAD) ?? null;

/**
 * The Feedback Split of one Guess over a Candidate Set with every word shown, as in the video: one block per
 * Feedback, biggest first, flowing left to right and wrapping. A block's head is the Guess with that Feedback's five
 * Marks (smaller Tiles for a smaller group) and the group's word count; under it the group's words, alphabetical, as
 * plain text (no Tiles, no Mark colours), in about √n columns (never more than fit). A word is one text element, so the ~2,315 words
 * of a whole Answer List stay light.
 * `highlightCode` outlines one group and `highlightWord` draws one word as strong text.
 * Each head opens one shared stats card (the Feedback, words, chance and information; see `useHeadCard`) on hover, focus or tap.
 * The heads are one tab stop of their own (roving, like the words): Left and Right (or Page Up and Down) move between heads,
 * Home and End go to the first and last, Down goes to the head's first word, and Up from the first row of words comes back.
 * With `wordLink` every word is a button: hovering it (mouse), tapping it, or Enter on it shows one shared card (a Radix
 * Popover anchored to that word) with the word and a link to `wordLink(word)`. The picked word stays strong until another
 * is picked. The words are one tab stop with arrow-key roving focus; the handlers are on the root, not on each word.
 */
export const SplitGroups = memo(function SplitGroups({
  split,
  lang = DEFAULT_LANGUAGE,
  highlightCode,
  highlightWord,
  layoutWidth,
  wordLink,
}: {
  split: SplitResponse;
  lang?: Language;
  highlightCode?: number;
  highlightWord?: string;
  /** Lay the blocks out as if the container were this wide (in pixels), instead of measuring it (the Opener Split's fit mode). */
  layoutWidth?: number;
  /** Turns a word into a link (the Opener Split page): where its card's "Follow this Answer" goes. Without it words are plain text. */
  wordLink?: (word: string) => string;
}) {
  const text = pageText(lang);
  const groups = useMemo(() => orderSplitGroups(split.split), [split.split]);
  const [ref, available] = useColumns(BLOCK_EXTRA, layoutWidth);
  const guess = split.word;
  const linked = wordLink !== undefined;

  // The roving tab stops (the last focused word, and the last focused head; the first of each until then) and the picked word (the one whose card opened last).
  const [focused, setFocused] = useState<string | null>(null);
  const [focusedHead, setFocusedHead] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // Two cards share the root, and only the one opened last shows.
  const [lastCard, setLastCard] = useState<"word" | "head">("word");
  const wordCard = useHoverCard({
    selector: "[data-word]",
    enabled: linked,
    resetKey: split,
    interactive: true,
    label: (el) => el.dataset.word ?? "",
    onShow: (el) => setPicked(el.dataset.word!),
    onOpen: () => setLastCard("word"),
    suppressed: lastCard !== "word",
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
  const headCard = useHeadCard({ text, resetKey: split, onOpen: () => setLastCard("head"), suppressed: lastCard !== "head" });

  const first = groups[0]?.words[0];
  const tabWord = focused !== null && groups.some((g) => g.words.includes(focused)) ? focused : first;
  const firstHead = groups[0]?.marks;
  const tabHead = focusedHead !== null && groups.some((g) => g.marks === focusedHead) ? focusedHead : firstHead;

  /** Moves the focus along the words: by `step` words (across blocks), by `step` in a block's grid, or to a block's first word. */
  const roam = (el: HTMLElement, key: string): HTMLElement | null => {
    const all = () => [...(ref.current?.querySelectorAll<HTMLElement>("[data-word]") ?? [])];
    const list = el.closest("ul")!;
    const here = [...list.querySelectorAll<HTMLElement>("[data-word]")];
    const at = here.indexOf(el);
    const cols = Number(list.dataset.cols) || 1;
    const block = el.closest("[data-marks]");
    switch (key) {
      case "ArrowRight":
      case "ArrowLeft": {
        const every = all();
        return every[every.indexOf(el) + (key === "ArrowRight" ? 1 : -1)] ?? null;
      }
      case "ArrowDown":
        return here[at + cols] ?? null;
      case "ArrowUp":
        // From the first row, back up to the block's head.
        return here[at - cols] ?? block?.querySelector<HTMLElement>(HEAD) ?? null;
      case "PageDown":
        return block?.nextElementSibling?.querySelector<HTMLElement>("[data-word]") ?? null;
      case "PageUp":
        return block?.previousElementSibling?.querySelector<HTMLElement>("[data-word]") ?? null;
      case "Home":
        return all()[0] ?? null;
      case "End":
        return all().at(-1) ?? null;
    }
    return null;
  };

  /** The same for a head: along the heads, or down into its block's first word. */
  const roamHeads = (el: HTMLElement, key: string): HTMLElement | null => {
    const all = [...(ref.current?.querySelectorAll<HTMLElement>(HEAD) ?? [])];
    switch (key) {
      case "ArrowRight":
      case "PageDown":
        return all[all.indexOf(el) + 1] ?? null;
      case "ArrowLeft":
      case "PageUp":
        return all[all.indexOf(el) - 1] ?? null;
      case "ArrowDown":
        return el.closest("[data-marks]")?.querySelector<HTMLElement>("[data-word]") ?? null;
      case "Home":
        return all[0] ?? null;
      case "End":
        return all.at(-1) ?? null;
    }
    return null;
  };

  const handlers = {
    onPointerOver: chain<React.PointerEvent>(wordCard.handlers.onPointerOver, headCard.handlers.onPointerOver),
    onPointerOut: chain<React.PointerEvent>(wordCard.handlers.onPointerOut, headCard.handlers.onPointerOut),
    onPointerDown: chain<React.PointerEvent>(wordCard.handlers.onPointerDown, headCard.handlers.onPointerDown),
    onClick: chain<React.MouseEvent>(wordCard.handlers.onClick, headCard.handlers.onClick),
    onFocus: chain<React.FocusEvent>(
      (e) => {
        const el = wordOf(e.target);
        if (el && linked) setFocused(el.dataset.word!);
        const head = headOf(e.target);
        if (head) setFocusedHead(head.dataset.head!);
      },
      headCard.handlers.onFocus,
    ),
    onBlur: headCard.handlers.onBlur,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const head = headOf(e.target);
      const word = linked ? wordOf(e.target) : null;
      const next = head ? roamHeads(head, e.key) : word ? roam(word, e.key) : null;
      if (!next) return;
      e.preventDefault();
      next.focus();
    },
  };

  return (
    <div ref={ref} className="min-w-0 font-sans" style={layoutWidth === undefined ? undefined : { width: layoutWidth }} {...handlers}>
      <ul aria-label={text.splitGroupsLabel(guess)} className="flex flex-wrap items-start gap-x-5 gap-y-6">
        {groups.map((g) => (
          <Block
            key={g.marks}
            group={g}
            guess={guess}
            total={split.candidates}
            columns={columnCount(g.count, available)}
            text={text}
            outlined={g.code === highlightCode}
            highlightWord={highlightWord}
            linked={linked}
            picked={picked !== null && g.words.includes(picked) ? picked : null}
            tabWord={tabWord !== undefined && g.words.includes(tabWord) ? tabWord : null}
            headTab={g.marks === tabHead ? 0 : -1}
          />
        ))}
      </ul>
      {wordCard.node}
      {headCard.node}
    </div>
  );
});

/** One Feedback's block: its head (the Guess in that Feedback's Marks, the word count) and its words. Memoised, so picking a word redraws only its own block. */
const Block = memo(function Block({
  group: g,
  guess,
  columns,
  text,
  outlined,
  highlightWord,
  linked,
  picked,
  tabWord,
  total,
  headTab,
}: {
  group: OrderedGroup;
  guess: string;
  total: number;
  headTab: 0 | -1;
  columns: number;
  text: ReturnType<typeof pageText>;
  outlined: boolean;
  highlightWord?: string;
  linked: boolean;
  /** The picked word, when it is in this block. */
  picked: string | null;
  /** The word that is the tab stop, when it is in this block. */
  tabWord: string | null;
}) {
  return (
    <li
      data-marks={g.marks}
      aria-current={outlined ? "true" : undefined}
      className={`max-w-full rounded-md p-1.5 ${outlined ? "outline-2 outline-offset-1 outline-accent" : ""}`}
    >
      <SplitBlock
        marks={g.marks}
        count={g.count}
        words={g.words}
        guess={guess}
        columns={columns}
        text={text}
        highlightWord={highlightWord}
        linked={linked}
        picked={picked}
        tabWord={tabWord}
        total={total}
        headTab={headTab}
      />
    </li>
  );
});
