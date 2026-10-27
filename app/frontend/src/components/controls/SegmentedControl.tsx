"use client";

import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Joined buttons that choose one of a few options: a Radix `RadioGroup` (`role="radiogroup"`, the arrow keys move
 * within it, Tab leaves it), the chosen button on `highlight-med`. It sets its own UI sans, so it looks the same
 * wherever it sits. Name it with `labelledBy` (the id of a visible label, such as a `Field`'s) or `label`.
 * A parent that uses the arrow keys should skip `[role=radiogroup]`.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  names,
  labelledBy,
  label,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly T[];
  names: Record<T, string>;
  labelledBy?: string;
  label?: string;
  className?: string;
}) {
  return (
    <RadioGroup.Root
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      orientation="horizontal"
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className={cn("inline-flex gap-0.5 rounded-sm border border-rule p-0.5 font-sans text-sm", className)}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option}
          value={option}
          className="cursor-pointer rounded-xs px-2.5 py-1 whitespace-nowrap text-meta hover:bg-highlight-low hover:text-text data-[state=checked]:bg-highlight-med data-[state=checked]:text-text"
        >
          {names[option]}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
