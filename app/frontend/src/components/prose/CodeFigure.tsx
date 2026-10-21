"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

// A highlighted code block (rehype-pretty-code's <figure>): the title and the lines are server-rendered;
// only this wrapper is a client component, for the copy button. It copies the code's text, which has no
// line numbers (those are CSS counters).
export function CodeFigure({ children, ...props }: ComponentProps<"figure">) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const code = ref.current?.querySelector("pre code")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure ref={ref} {...props}>
      {children}
      <Button type="button" variant="ghost" size="icon-xs" className="code-copy" aria-label="Copy code" onClick={copy}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Code copied" : ""}
      </span>
    </figure>
  );
}
