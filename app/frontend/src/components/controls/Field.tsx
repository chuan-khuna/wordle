import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { InfoTip } from "./InfoTip";

/** The one label style of every field: sentence case, small UI sans, `meta`. (The uppercase `eyebrow` is for section titles.) */
export const FIELD_LABEL = "font-sans text-sm font-normal text-meta";

/**
 * A label, an optional ⓘ `InfoTip`, and the control. `layout="inline"` puts the label in a column beside the control
 * (wrapping above it when the row is too narrow, as on a phone); `"stacked"` puts it above. Name the control one of two ways:
 * `htmlFor` makes the label a `<label>` for that input's id; `labelId` gives the label that id, for a control that takes
 * `aria-labelledby` (a `SegmentedControl`).
 */
export function Field({
  label,
  htmlFor,
  labelId,
  tip,
  layout = "stacked",
  className,
  labelClassName,
  children,
}: {
  label: string;
  htmlFor?: string;
  labelId?: string;
  /** The ⓘ button's accessible name and its card's lines (see `InfoTip`). */
  tip?: { label: string; lines: readonly string[] };
  layout?: "inline" | "stacked";
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  const inline = layout === "inline";
  const text = htmlFor ? (
    <Label htmlFor={htmlFor} id={labelId} className={cn(FIELD_LABEL, labelClassName)}>
      {label}
    </Label>
  ) : (
    <span id={labelId} className={cn(FIELD_LABEL, labelClassName)}>
      {label}
    </span>
  );
  const head = tip ? (
    <span className={cn("flex items-center", inline && "w-32 shrink-0")}>
      {text}
      <InfoTip label={tip.label} lines={tip.lines} />
    </span>
  ) : inline ? (
    <span className="flex w-32 shrink-0 items-center">{text}</span>
  ) : (
    text
  );
  return (
    <div className={cn(inline ? "flex flex-wrap items-center gap-x-3 gap-y-1" : "grid gap-1.5", className)}>
      {head}
      {children}
    </div>
  );
}
