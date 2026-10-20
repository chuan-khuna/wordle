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
    <span className="group sm:relative">
      <span tabIndex={0} aria-describedby={id} className="cursor-help underline decoration-accent decoration-dotted decoration-1 underline-offset-4">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className="absolute z-10 mt-8 hidden w-auto rounded-sm border border-rule-strong bg-overlay p-3 font-sans text-sm leading-snug font-normal tracking-normal text-text normal-case not-italic group-focus-within:block group-hover:block max-sm:inset-x-0 sm:bottom-full sm:left-0 sm:mt-0 sm:mb-2 sm:w-72 sm:max-w-[80vw]"
      >
        <strong className="font-medium">{entry.term}</strong>: {entry.definition}
      </span>
    </span>
  );
}
