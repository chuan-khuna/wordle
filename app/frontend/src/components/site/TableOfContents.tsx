"use client";

import {
  ChartBarBig,
  ChartColumnBig,
  ChartColumnStacked,
  Columns2,
  ListFilter,
  SpellCheck,
  StepForward,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { TocEntry, WidgetName } from "@/lib/content/toc";
import { REACHED, readingState, type ReadingState } from "@/lib/content/reading-progress";

/** The icon before a Widget's entry, a hint of what the Widget is. */
const WIDGET_ICONS: Record<WidgetName, LucideIcon> = {
  FeedbackScorer: SpellCheck,
  CandidateFilter: ListFilter,
  SplitExplorer: ChartBarBig,
  StepThroughGame: StepForward,
  SideBySideGame: Columns2,
  OpenerTable: Table2,
  BenchmarkChart: ChartColumnBig,
  OpenerDistribution: ChartColumnStacked,
};

/** Each entry's indent level: a `##` heading 0, a `###` 1, a Widget one more than the heading it follows (0 before any). */
function levels(entries: TocEntry[]) {
  let heading = -1;
  return entries.map((e) => {
    if (e.kind === "heading") return (heading = e.depth - 2);
    return heading + 1;
  });
}

const INDENT = ["pl-3", "pl-6", "pl-9"];

/** The reading state from the page as it is scrolled now. */
function measure(ids: string[]): ReadingState {
  const tops = ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity);
  const end = document.querySelector(".article-body")?.getBoundingClientRect().bottom ?? Infinity;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  return readingState(tops, end, window.innerHeight * REACHED, atBottom);
}

/**
 * An Article's Table of contents: its `##` and `###` headings and its Widgets (each after an icon that hints at
 * what it is) as links, the section being read marked (`aria-current`) and each link's left rule filled as far as
 * its section (up to the next entry) is read. Rendered on the server; the
 * marking and the fill follow the scroll once it hydrates. Where it sits (a sticky column left of the Article on
 * wide windows, hidden otherwise) is `.article-toc` in globals.css.
 */
export function TableOfContents({ entries, label }: { entries: TocEntry[]; label: string }) {
  const [state, setState] = useState<ReadingState>({ current: null, progress: [] });

  useEffect(() => {
    const ids = entries.map((e) => e.id);
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setState(measure(ids)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [entries]);

  const indent = levels(entries);

  return (
    <nav aria-labelledby="toc-label" className="article-toc font-sans">
      <h2 id="toc-label" className="eyebrow mb-2">
        {label}
      </h2>
      <ol className="space-y-0.5">
        {entries.map((e, i) => {
          const here = i === state.current;
          const Icon = e.kind === "widget" ? WIDGET_ICONS[e.widget] : null;
          return (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                aria-current={here ? "location" : undefined}
                className={`group relative flex items-start gap-1.5 py-1 text-sm ${INDENT[indent[i]] ?? INDENT.at(-1)} ${
                  here ? "font-medium text-text" : "text-meta hover:text-text"
                }`}
              >
                {/* The rule, and over it the part of the section read so far. */}
                <span aria-hidden className="absolute inset-y-0 left-0 w-px bg-rule group-hover:bg-rule-strong" />
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-px origin-top bg-text"
                  style={{ transform: `scaleY(${state.progress[i] ?? 0})` }}
                />
                {Icon && <Icon aria-hidden className="mt-[0.2em] size-3.5 shrink-0" />}
                <span>{e.text}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
