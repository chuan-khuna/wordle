import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { cn } from "@/lib/utils";

/**
 * Which word list a word is on, as a small badge named with the glossary term (English in Thai too): `answer` for an
 * Answer List word (accent), `guess` for a word only on the Guess List (quiet). The Guess List holds the whole Answer
 * List, so an Answer List word gets only the `answer` badge.
 */
export function WordListBadge({ list, lang = DEFAULT_LANGUAGE, className }: { list: "answer" | "guess"; lang?: Language; className?: string }) {
  const text = pageText(lang);
  return (
    <span
      title={list === "answer" ? text.onAnswerList : text.onGuessListOnly}
      className={cn(
        "inline-block rounded-sm border px-1.5 py-0.5 font-sans text-xs leading-4 whitespace-nowrap",
        list === "answer" ? "border-accent text-accent" : "border-rule text-meta",
        className,
      )}
    >
      <span aria-hidden="true">{list === "answer" ? "Answer List" : "Guess List"}</span>
      <span className="sr-only">{list === "answer" ? text.onAnswerList : text.onGuessListOnly}</span>
    </span>
  );
}
