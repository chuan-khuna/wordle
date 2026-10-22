"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/content/headings";

/** How far below the top of the window a heading counts as reached, so the section being read is the current one. */
const REACHED = 0.25;

/** The id of the last heading scrolled past (or the last one at the bottom of the page), or null above the first. */
function currentHeading(ids: string[]) {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) return ids.at(-1) ?? null;
  let current: string | null = null;
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= window.innerHeight * REACHED) current = id;
  }
  return current;
}

/**
 * An Article's Table of contents: its `##` and `###` headings as links, the section being read marked
 * (`aria-current`). Rendered on the server; the marking follows the scroll once it hydrates. Where it sits
 * (a sticky column left of the Article on wide windows, hidden otherwise) is `.article-toc` in globals.css.
 */
export function TableOfContents({ headings, label }: { headings: Heading[]; label: string }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const ids = headings.map((h) => h.id);
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setCurrent(currentHeading(ids)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [headings]);

  return (
    <nav aria-labelledby="toc-label" className="article-toc font-sans">
      <h2 id="toc-label" className="eyebrow mb-2">
        {label}
      </h2>
      <ol className="space-y-0.5">
        {headings.map((h) => {
          const here = h.id === current;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                aria-current={here ? "location" : undefined}
                className={`block border-l py-1 text-sm ${h.depth === 3 ? "pl-6" : "pl-3"} ${
                  here ? "border-text font-medium text-text" : "border-rule text-meta hover:border-rule-strong hover:text-text"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
