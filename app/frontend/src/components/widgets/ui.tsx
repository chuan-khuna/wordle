import type { ReactNode } from "react";

/** Every Widget is a figure in the text: hairline rules above and below, a small caption-style title, UI sans. */
export function WidgetFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="not-prose my-figure border-y border-rule py-6 font-sans text-sm">
      <h3 className="eyebrow mb-4">{title}</h3>
      {children}
    </section>
  );
}

/** Chart axis and grid text: the UI sans at caption size, in `meta`, with tabular figures. */
export const CHART_CLASS = [
  "font-sans text-xs text-meta tabular-nums",
  // Tooltip: overlay panel, hairline border, small radius, no shadow, same type as the axes.
  "[--ts-chart-tooltip-background:var(--overlay)] [--ts-chart-tooltip-color:var(--text)]",
  "[--ts-chart-tooltip-border:1px_solid_var(--highlight-high)] [--ts-chart-tooltip-border-radius:2px]",
  "[--ts-chart-tooltip-shadow:none] [--ts-chart-tooltip-font:400_12px/1.4_var(--font-sans)]",
].join(" ");

/** Chart guide colours: a hairline grid in the rule colour. Pass as `theme` to `defineChart`. */
export const CHART_THEME = { grid: "var(--highlight-med)" } as const;
