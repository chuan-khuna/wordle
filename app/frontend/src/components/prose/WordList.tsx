import { ChevronRight } from "lucide-react";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { answerList } from "@/lib/wordle/words";
import { PLAIN, TILE } from "./letter-tile";

const LISTS = ["answers"] as const;

/**
 * A whole word list in prose, closed until the reader opens it: `<WordList list="answers" />` is a native
 * `<details>` (no client JS) whose summary names the list and its size, holding every word grouped by first letter,
 * each group under a letter tile and its count, in a box that scrolls (and takes keyboard focus) past 28rem. Only the Answer List for now; an unknown `list` throws, which fails the build.
 */
export function WordList({ list, lang = DEFAULT_LANGUAGE }: { list: string; lang?: Language }) {
  if (!(LISTS as readonly string[]).includes(list)) {
    throw new Error(`<WordList>: list "${list}" must be one of ${LISTS.join(", ")}.`);
  }
  const text = pageText(lang);
  const words = answerList();
  const groups = Map.groupBy(words, (w) => w[0]);

  return (
    <details className="not-prose group my-flow rounded-sm border border-rule font-sans">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-text select-none hover:bg-highlight-low [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 shrink-0 text-meta transition-transform group-open:rotate-90" />
        {text.showWordList(words.length.toLocaleString("en-US"))}
      </summary>
      <div tabIndex={0} className="max-h-[28rem] space-y-5 overflow-y-auto overscroll-contain border-t border-rule px-4 py-4">
        {[...groups].map(([letter, group]) => (
          <section key={letter} aria-label={`${letter.toUpperCase()}, ${group.length}`}>
            <h3 className="mb-2 flex items-center gap-2 text-xs text-meta">
              <span aria-hidden className={`${TILE} ${PLAIN} text-base`}>
                {letter}
              </span>
              <span className="tabular-nums">{group.length}</span>
            </h3>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-caps text-text">
              {group.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
