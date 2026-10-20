import { TermTip } from "@/components/TermTip";
import { lookupTerm } from "@/lib/glossary";

/**
 * A glossary term with its definition from GLOSSARY.md, shown on hover, keyboard focus or tap (see TermTip).
 * `<Term>Candidate Set</Term>`, or `<Term of="Candidate">candidates</Term>` when the text differs.
 * An unknown term throws, which fails the build.
 */
export function Term({ children, of }: { children: React.ReactNode; of?: string }) {
  const name = of ?? (typeof children === "string" ? children : undefined);
  if (name === undefined) {
    throw new Error('<Term>: pass the term as plain text, or give it with of="...".');
  }
  const entry = lookupTerm(name);
  return (
    <TermTip term={entry.term} definition={entry.definition}>
      {children}
    </TermTip>
  );
}
