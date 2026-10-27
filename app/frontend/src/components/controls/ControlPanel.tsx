import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A group of controls: the UI sans at `text-sm` (the page body is serif) and an even vertical rhythm. Pass `plain`
 * for the font alone, with no spacing of its own (`WidgetFrame` does, as its content spaces itself).
 */
export function ControlPanel({ plain, className, children }: { plain?: boolean; className?: string; children: ReactNode }) {
  return <div className={cn("font-sans text-sm", !plain && "grid gap-4", className)}>{children}</div>;
}
