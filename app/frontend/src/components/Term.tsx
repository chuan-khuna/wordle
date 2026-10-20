import { useId } from "react";
import { lookupTerm } from "@/lib/glossary";

/**
 * A glossary term with its definition from GLOSSARY.md, shown on hover or keyboard focus.
 * `<Term>Candidate Set</Term>`, or `<Term of="Candidate">candidates</Term>` when the text differs.
 * An unknown term throws, which fails the build.
 */
export function Term({ children, of }: { children: React.ReactNode; of?: string }) {
  const id = useId();
  const name = of ?? (typeof children === "string" ? children : undefined);
  if (name === undefined) {
    throw new Error('<Term>: pass the term as plain text, or give it with of="...".');
  }
  const entry = lookupTerm(name);
  return (
    <span className="group relative">
      <span tabIndex={0} aria-describedby={id} className="cursor-help underline decoration-accent decoration-dotted underline-offset-4">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className="invisible absolute bottom-full left-0 z-10 mb-1 block w-72 max-w-[80vw] rounded-md border border-highlight-med bg-overlay p-3 text-sm leading-snug font-normal text-text shadow-lg group-focus-within:visible group-hover:visible"
      >
        <strong className="text-heading">{entry.term}</strong>: {entry.definition}
      </span>
    </span>
  );
}
