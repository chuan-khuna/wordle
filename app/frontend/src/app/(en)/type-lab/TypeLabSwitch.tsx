"use client";

import { useState } from "react";

/** A pairing: which loaded families stand in for the serif, the sans (and tiles) and the mono. */
export type Pairing = { id: string; label: string; note: string; serif: string; sans: string; mono: string };

/**
 * The type lab's switch. It points the three font variables tokens.css reads (`--font-newsreader`, `--font-inter`,
 * `--font-jetbrains-mono`) at another pairing's families, for everything inside it.
 */
export function TypeLabSwitch({ pairings, fontClasses, children }: { pairings: Pairing[]; fontClasses: string; children: React.ReactNode }) {
  const [id, setId] = useState(pairings[0].id);
  const p = pairings.find((x) => x.id === id) ?? pairings[0];
  // Both the loaded-font variables (used by font-* utilities) and the role variables (used by CSS such as prose-theme,
  // already resolved at :root), so every text on the page follows the pairing.
  const vars =
    p.id === "current"
      ? {}
      : {
          "--font-newsreader": p.serif,
          "--font-inter": p.sans,
          "--font-jetbrains-mono": p.mono,
          "--font-serif": `${p.serif}, Georgia, serif`,
          "--font-sans": `${p.sans}, ui-sans-serif, system-ui, sans-serif`,
          "--font-mono": `${p.mono}, ui-monospace, monospace`,
          "--font-tile": `${p.sans}, ui-sans-serif, system-ui, sans-serif`,
        };
  return (
    <div className={fontClasses}>
      <div className="sticky top-0 z-40 -mx-4 mb-10 border-b border-rule bg-background/95 px-4 py-3 font-sans text-sm backdrop-blur">
        <div role="radiogroup" aria-label="Font pairing" className="flex flex-wrap gap-2">
          {pairings.map((x) => (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={x.id === id}
              onClick={() => setId(x.id)}
              className={`cursor-pointer rounded-sm border px-3 py-1.5 ${x.id === id ? "border-text text-text" : "border-rule text-meta hover:text-text"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-meta">{p.note}</p>
      </div>
      {/* font-serif again here: the body resolved it before these variables changed, and children inherit that. */}
      <div className="font-serif" style={vars as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}
