"use client";

import { RadioGroup } from "radix-ui";
import { useId } from "react";
import type { Pool, Rank, Scope } from "@/lib/api";
import { POOL_NAMES, POOLS, RANKING_NAMES, RANKS, SCOPE_NAMES, SCOPES, strategyFor } from "@/lib/wordle/strategies";

export interface StrategyChoice {
  pool: Pool;
  scope: Scope;
  by: Rank;
}

/**
 * The three choices that make up a Strategy, each as a row of joined buttons (as in the gpui app's Solver panel):
 * Guess Pool, Search Scope and Ranking, then the Strategy they name. Each row is a radio group, so the arrow
 * keys move within it (a parent that uses the arrow keys should skip `[role=radiogroup]`).
 */
export function StrategyPicker({ value, onChange }: { value: StrategyChoice; onChange: (next: StrategyChoice) => void }) {
  return (
    <div className="grid gap-2">
      <Segmented label="Guess Pool" value={value.pool} options={POOLS} names={POOL_NAMES} onChange={(pool) => onChange({ ...value, pool })} />
      <Segmented label="Search Scope" value={value.scope} options={SCOPES} names={SCOPE_NAMES} onChange={(scope) => onChange({ ...value, scope })} />
      <Segmented label="Ranking" value={value.by} options={RANKS} names={RANKING_NAMES} onChange={(by) => onChange({ ...value, by })} />
      <p className="text-sm text-meta">
        Strategy: <span className="text-text">{strategyFor(value.by, value.pool, value.scope).name}</span>
      </p>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  names,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  names: Record<T, string>;
  onChange: (next: T) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span id={labelId} className="w-28 shrink-0 text-sm text-meta">
        {label}
      </span>
      <RadioGroup.Root
        aria-labelledby={labelId}
        orientation="horizontal"
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className="inline-flex gap-0.5 rounded-sm border border-rule p-0.5"
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option}
            value={option}
            className="cursor-pointer rounded-xs px-2.5 py-1 text-sm whitespace-nowrap text-meta hover:bg-highlight-low hover:text-text data-[state=checked]:bg-highlight-med data-[state=checked]:text-text"
          >
            {names[option]}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
