import type { ReactNode } from "react";
import { ControlPanel } from "@/components/controls/ControlPanel";

/**
 * Every Widget is a figure in the text: hairline rules above and below, a small caption-style title, UI sans (its
 * content is a `ControlPanel`). `hideTitle` leaves the title out where the page has already said it (the /openers page's
 * heading); the section keeps it as its name.
 */
export function WidgetFrame({ title, hideTitle, children }: { title: string; hideTitle?: boolean; children: ReactNode }) {
  return (
    <section aria-label={title} className="not-prose my-figure border-y border-rule py-6">
      <ControlPanel plain>
        {!hideTitle && <h3 className="eyebrow mb-4">{title}</h3>}
        {children}
      </ControlPanel>
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
