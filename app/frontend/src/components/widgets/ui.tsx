import type { ReactNode } from "react";

/** Lowercase letters only, at most five. */
export function cleanWord(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, "").slice(0, 5);
}

/** The card every Widget sits in. */
export function WidgetFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="not-prose my-8 rounded-lg border border-highlight-med bg-surface p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-subtle uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function WordInput({
  id,
  label,
  value,
  onChange,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hideLabel?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1 block text-sm text-subtle"}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(cleanWord(e.target.value))}
        maxLength={5}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="five letters"
        className="w-full rounded-md border border-highlight-high bg-background px-3 py-2 font-mono text-lg uppercase text-text placeholder:text-muted placeholder:normal-case focus-visible:outline-2 focus-visible:outline-accent"
      />
    </div>
  );
}

/** The wrapper every chart sits in: `currentColor` text and grid from `text-subtle`, tooltip colours from theme roles. */
export const CHART_CLASS =
  "text-subtle [--ts-chart-tooltip-background:var(--overlay)] [--ts-chart-tooltip-color:var(--text)]";
