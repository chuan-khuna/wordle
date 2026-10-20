"use client";

import { useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The client half of <Term>: the underlined text and its definition in a shadcn Tooltip. It opens on hover
 * and on keyboard focus (Radix), and on tap, which toggles it; Escape or a tap elsewhere closes it. The trigger is focusable and described by the tooltip while it is open.
 */
export function TermTip({ term, definition, children }: { term: string; definition: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // The last pointer gesture on the trigger: for a tap, whether the tooltip was already open when it began.
  const gesture = useRef<{ touch: boolean; wasOpen: boolean }>({ touch: false, wasOpen: false });
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        asChild
        onPointerDown={(event) => {
          gesture.current = { touch: event.pointerType !== "mouse", wasOpen: open };
        }}
        onClick={(event) => {
          // Radix closes on click, and a tap also opens it through focus. For a tap, toggle instead.
          if (!gesture.current.touch) return;
          event.preventDefault();
          setOpen(!gesture.current.wasOpen);
        }}
      >
        <span tabIndex={0} className="cursor-help underline decoration-accent decoration-dotted decoration-1 underline-offset-4">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-sm:max-w-[calc(100vw-2.5rem)] sm:w-72">
        <strong className="font-medium">{term}</strong>: {definition}
      </TooltipContent>
    </Tooltip>
  );
}
