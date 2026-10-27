import { TermTip } from "@/components/prose/TermTip";
import { lookupTerm } from "@/lib/content/glossary";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { cn } from "@/lib/utils";

/**
 * Which word list a word is on, as a quiet label (small text with a term's dotted underline, no box) named with the
 * glossary term (English in Thai too): `answer` for an Answer List word (accent), `guess` for a word only on the Guess List (muted). The Guess List holds the whole Answer
 * List, so an Answer List word gets only the `answer` badge. The badge is a `TermTip`, so it opens that term's glossary
 * card as `<Term>` does (hover, focus or tap).
 */
export function WordListBadge({ list, lang = DEFAULT_LANGUAGE, className }: { list: "answer" | "guess"; lang?: Language; className?: string }) {
  const entry = lookupTerm(list === "answer" ? "Answer List" : "Guess List", lang);
  return (
    <TermTip
      term={entry.term}
      definition={entry.definition}
      lang={lang}
      className={cn(
        "inline-block cursor-help rounded-xs font-sans text-[11px] leading-4 font-normal tracking-normal whitespace-nowrap underline decoration-dotted decoration-1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        list === "answer" ? "text-accent decoration-accent" : "text-meta decoration-rule-strong",
        className,
      )}
    >
      {entry.term}
    </TermTip>
  );
}
