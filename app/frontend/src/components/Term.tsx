import { TermTip } from "@/components/TermTip";
import { lookupTerm } from "@/lib/glossary";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/language";

/**
 * A glossary term with its definition from `content/glossary.json`, shown on hover, keyboard focus or tap (see TermTip).
 * `<Term>Candidate Set</Term>`, or `<Term of="Candidate">candidates</Term>` when the text differs.
 * An unknown term throws, which fails the build. `lang` is not written in MDX: the Article page binds it through its MDX components (see mdx-components.tsx).
 */
export function Term({ children, of, lang = DEFAULT_LANGUAGE }: { children: React.ReactNode; of?: string; lang?: Language }) {
  const name = of ?? (typeof children === "string" ? children : undefined);
  if (name === undefined) {
    throw new Error('<Term>: pass the term as plain text, or give it with of="...".');
  }
  const entry = lookupTerm(name, lang);
  return (
    <TermTip term={entry.term} definition={entry.definition} lang={lang}>
      {children}
    </TermTip>
  );
}
