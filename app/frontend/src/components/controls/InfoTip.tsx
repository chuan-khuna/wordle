"use client";

import { Info } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useRef, useState } from "react";

// Hover delays, as for the glossary cards: open after a short rest, close a little after the pointer leaves.
const OPEN_DELAY = 150;
const CLOSE_DELAY = 250;

/**
 * The ⓘ button after a row's label and its card (a Radix Popover, looking like a glossary card): the first line says
 * what the row decides, then one line for each option. It opens on hover, on keyboard focus and on tap (a tap toggles);
 * Escape or a tap elsewhere closes it. The button sits outside the radio group, so the arrow keys stay the group's.
 */
export function InfoTip({ label, lines }: { label: string; lines: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The last pointer gesture: for a tap, whether the card was already open when it began (a tap focuses first, which opens it).
  const gesture = useRef({ touch: false, wasOpen: false });
  useEffect(() => () => clearTimeout(timer.current), []);

  const later = (next: boolean, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  };
  const now = (next: boolean) => {
    clearTimeout(timer.current);
    setOpen(next);
  };
  const mouse = (e: React.PointerEvent) => e.pointerType === "mouse";
  // The Step-through Game steps on Left and Right; they are not for this button or its card.
  const keepArrows = (e: React.KeyboardEvent) => (e.key === "ArrowLeft" || e.key === "ArrowRight") && e.stopPropagation();
  const [summary, ...options] = lines;

  return (
    <Popover.Root open={open} onOpenChange={now}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-haspopup="dialog"
          className="inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-xs text-meta hover:text-text"
          onPointerEnter={(e) => mouse(e) && (open ? clearTimeout(timer.current) : later(true, OPEN_DELAY))}
          onPointerLeave={(e) => mouse(e) && later(false, CLOSE_DELAY)}
          onPointerDown={(e) => {
            gesture.current = { touch: !mouse(e), wasOpen: open };
          }}
          onClick={(e) => {
            // Radix toggles on click; a mouse click keeps a hovered card open, a tap toggles from before the tap.
            e.preventDefault();
            now(gesture.current.touch ? !gesture.current.wasOpen : true);
          }}
          onKeyDown={keepArrows}
          onFocus={() => !open && now(true)}
          onBlur={() => later(false, CLOSE_DELAY)}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={4}
          collisionPadding={20}
          className="z-50 w-fit max-w-72 rounded-sm border border-rule-strong bg-popover px-3 py-2 font-sans text-sm leading-snug font-normal text-popover-foreground shadow-md outline-none max-sm:max-w-[calc(100vw-2.5rem)] sm:w-72 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerEnter={(e) => mouse(e) && clearTimeout(timer.current)}
          onPointerLeave={(e) => mouse(e) && later(false, CLOSE_DELAY)}
          onFocus={() => clearTimeout(timer.current)}
          onKeyDown={keepArrows}
        >
          <p>{summary}</p>
          <ul className="mt-1.5 grid gap-1">
            {options.map((line) => {
              const [name, ...rest] = line.split(": ");
              return (
                <li key={line}>
                  <strong className="font-medium">{name}</strong>: {rest.join(": ")}
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
