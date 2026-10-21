"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Popover } from "radix-ui";
import { MARK_LABEL, MARK_PAINT } from "@/components/mark-style";
import { MARK_KINDS, type MarkKind, glossary, lookupMark, splitDefinition } from "@/lib/glossary";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/language";

export const TERM_UNDERLINE = "cursor-help underline decoration-accent decoration-dotted decoration-1 underline-offset-4";

// Hover delays: open after a short rest on the term, close a little after the pointer leaves the term and its card.
const OPEN_DELAY = 150;
const CLOSE_DELAY = 250;

/** The terms of the cards this one is nested in, so a card does not link back to them. */
const Ancestors = createContext<readonly string[]>([]);

type Opener = "hover" | "focus" | "key" | "tap";

/**
 * The client half of <Term> and <Mark>: the underlined text and its definition in a card (a Radix Popover). It opens
 * on hover, on keyboard focus and on tap (a tap toggles it; a click pins a hovered card); Escape or a tap elsewhere
 * closes it. Every other glossary term in the definition is itself a term with its own card, so cards nest: hover
 * "Game", then "Guess Limit" in its card. The pointer may move from a term into its card and on into a nested card
 * without closing them (React counts a portal as inside its parent). Enter or Space on a term opens its card with the
 * focus in it, so the keyboard can reach the nested terms. A bold Mark name in a definition (the Mark entry's
 * **Correct**, **Present**, **Absent**) is drawn as that Mark's coloured label, with its own card, as <Mark> draws it; Escape closes the innermost card and returns the focus.
 */
export function TermTip({
  term,
  definition,
  children,
  className = TERM_UNDERLINE,
  style,
  lang = DEFAULT_LANGUAGE,
}: {
  term: string;
  definition: string;
  children: React.ReactNode;
  /** Classes for the focusable trigger; <Term> underlines it, <Mark> paints it as a label. */
  className?: string;
  style?: React.CSSProperties;
  /** The language of the card: which glossary its nested terms and Marks come from. */
  lang?: Language;
}) {
  const ancestors = useContext(Ancestors);
  const [open, setOpen] = useState(false);
  const opener = useRef<Opener>("hover");
  const card = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set while Radix returns the focus to the term on close, so that focus does not reopen the card.
  const returning = useRef(false);
  // The last pointer gesture on the term: for a tap, whether the card was already open when it began.
  const gesture = useRef<{ touch: boolean; wasOpen: boolean }>({ touch: false, wasOpen: false });

  useEffect(() => () => clearTimeout(timer.current), []);

  const later = (next: boolean, delay: number, by: Opener = "hover") => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next) opener.current = by;
      setOpen(next);
    }, delay);
  };
  const now = (next: boolean, by: Opener) => {
    clearTimeout(timer.current);
    if (next) opener.current = by;
    setOpen(next);
  };
  const keep = () => clearTimeout(timer.current);
  const mouse = (e: React.PointerEvent) => e.pointerType === "mouse";

  const nested = [...ancestors, term];
  const terms = [...glossary(lang).values()].map((e) => e.term);

  return (
    <Popover.Root open={open} onOpenChange={(next) => now(next, "tap")}>
      <Popover.Trigger asChild>
        <span
          tabIndex={0}
          role="button"
          aria-haspopup="dialog"
          className={className}
          style={style}
          onPointerEnter={(e) => mouse(e) && (open ? keep() : later(true, OPEN_DELAY))}
          onPointerLeave={(e) => mouse(e) && later(false, CLOSE_DELAY)}
          onPointerDown={(e) => {
            gesture.current = { touch: !mouse(e), wasOpen: open };
          }}
          onClick={(e) => {
            // Radix toggles on click. A tap may already have opened it through focus: toggle from before the tap.
            // A mouse click keeps a hovered card open.
            e.preventDefault();
            if (gesture.current.touch) now(!gesture.current.wasOpen, "tap");
            else now(true, opener.current);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            if (open && opener.current === "key") return now(false, "key");
            // Open (or keep open) with the focus in the card: on its first term, else the card itself.
            now(true, "key");
            requestAnimationFrame(() => (card.current?.querySelector<HTMLElement>("[role=button]") ?? card.current)?.focus());
          }}
          onFocus={() => !returning.current && !open && now(true, "focus")}
          onBlur={() => opener.current === "focus" && later(false, CLOSE_DELAY)}
        >
          {children}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={card}
          tabIndex={-1}
          aria-label={term}
          side="top"
          sideOffset={6}
          collisionPadding={20}
          className="z-50 w-fit max-w-72 rounded-sm border border-rule-strong bg-popover px-3 shadow-md py-2 font-sans text-sm leading-snug font-normal tracking-normal text-popover-foreground normal-case not-italic outline-none max-sm:max-w-[calc(100vw-2.5rem)] sm:w-72 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            if (opener.current === "key" || opener.current === "focus") {
              returning.current = true;
              setTimeout(() => (returning.current = false));
            } else e.preventDefault();
          }}
          onPointerEnter={(e) => mouse(e) && keep()}
          onPointerLeave={(e) => mouse(e) && later(false, CLOSE_DELAY)}
          onFocus={keep}
        >
          <Ancestors.Provider value={nested}>
            <strong className="font-medium">{term}</strong>:{" "}
            {splitDefinition(definition, terms, nested).map((part, i) =>
              part.kind === "term" ? (
                <TermTip key={i} term={part.term} definition={glossary(lang).get(part.term.toLowerCase())!.definition} lang={lang}>
                  {part.text}
                </TermTip>
              ) : part.kind === "bold" && isMarkKind(part.text) && !nested.includes(lookupMark(part.text.toLowerCase(), lang).name) ? (
                <MarkTip key={i} kind={part.text.toLowerCase() as MarkKind} lang={lang} />
              ) : part.kind === "bold" ? (
                <strong key={i} className="font-medium">
                  {part.text}
                </strong>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </Ancestors.Provider>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const isMarkKind = (text: string) => (MARK_KINDS as readonly string[]).includes(text.toLowerCase());

/** A Mark's coloured label with its own card, inside another card. */
function MarkTip({ kind, lang }: { kind: MarkKind; lang: Language }) {
  const { name, definition } = lookupMark(kind, lang);
  return (
    <TermTip term={name} definition={definition} lang={lang} className={`${MARK_LABEL} ${MARK_PAINT[kind]}`}>
      {name}
    </TermTip>
  );
}
