import { TermTip } from "@/components/prose/TermTip";
import { MARK_LABEL, MARK_PAINT } from "@/components/prose/mark-style";
import { lookupMark } from "@/lib/content/glossary";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";

/**
 * A Mark's name in prose, on that Mark's tile colours, with the Mark's definition from `content/glossary.json` on
 * hover, keyboard focus or tap (the same card as <Term>). `<Mark kind="correct" />` shows "Correct";
 * children replace the text: `<Mark kind="present">Present letters</Mark>`. An unknown kind throws, which fails the build.
 */
export function Mark({ kind, children, lang = DEFAULT_LANGUAGE }: { kind: string; children?: React.ReactNode; lang?: Language }) {
  const { name, definition } = lookupMark(kind, lang);
  return (
    <TermTip term={name} definition={definition} lang={lang} className={`${MARK_LABEL} ${MARK_PAINT[kind as keyof typeof MARK_PAINT]}`}>
      {children ?? name}
    </TermTip>
  );
}
