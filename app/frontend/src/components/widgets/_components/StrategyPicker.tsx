"use client";

import { useId } from "react";
import { ControlPanel } from "@/components/controls/ControlPanel";
import { Field } from "@/components/controls/Field";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import type { Pool, Rank, Scope } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { POOL_NAMES, POOLS, RANKING_NAMES, RANKS, SCOPE_NAMES, SCOPES, strategyFor } from "@/lib/wordle/strategies";

export interface StrategyChoice {
  pool: Pool;
  scope: Scope;
  by: Rank;
}

/**
 * The three choices that make up a Strategy, each as a row of joined buttons (as in the gpui app's Solver panel):
 * Guess Pool, Search Scope and Ranking, then the Strategy they name. Each row is a radio group, so the arrow
 * keys move within it (a parent that uses the arrow keys should skip `[role=radiogroup]`). A small info button after
 * each label opens a card saying what the choice decides and what each option means. Each row is a `Field` around a
 * `SegmentedControl`; the picker leaves its font to the surrounding `ControlPanel` or `WidgetFrame`.
 */
export function StrategyPicker({
  value,
  onChange,
  lang = DEFAULT_LANGUAGE,
}: {
  value: StrategyChoice;
  onChange: (next: StrategyChoice) => void;
  lang?: Language;
}) {
  const text = pageText(lang);
  return (
    <ControlPanel plain className="grid gap-2">
      <Segmented
        label={text.guessPoolLabel}
        tip={[text.guessPoolTip, text.guessPoolAnswers, text.guessPoolGuesses]}
        aboutLabel={text.aboutChoice(text.guessPoolLabel)}
        value={value.pool}
        options={POOLS}
        names={POOL_NAMES}
        onChange={(pool) => onChange({ ...value, pool })}
      />
      <Segmented
        label={text.searchScopeLabel}
        tip={[text.searchScopeTip, text.searchScopeCandidates, text.searchScopeAll]}
        aboutLabel={text.aboutChoice(text.searchScopeLabel)}
        value={value.scope}
        options={SCOPES}
        names={SCOPE_NAMES}
        onChange={(scope) => onChange({ ...value, scope })}
      />
      <Segmented
        label={text.rankingLabel}
        tip={[text.rankingTip, text.rankingBits, text.rankingExpected]}
        aboutLabel={text.aboutChoice(text.rankingLabel)}
        value={value.by}
        options={RANKS}
        names={RANKING_NAMES}
        onChange={(by) => onChange({ ...value, by })}
      />
      <p className="text-sm text-meta">
        {text.strategyLabel}: <span className="text-text">{strategyFor(value.by, value.pool, value.scope).name}</span>
      </p>
    </ControlPanel>
  );
}

function Segmented<T extends string>({
  label,
  tip,
  aboutLabel,
  value,
  options,
  names,
  onChange,
}: {
  label: string;
  tip: readonly string[];
  aboutLabel: string;
  value: T;
  options: readonly T[];
  names: Record<T, string>;
  onChange: (next: T) => void;
}) {
  const labelId = useId();
  return (
    <Field layout="inline" label={label} labelId={labelId} tip={{ label: aboutLabel, lines: tip }}>
      <SegmentedControl labelledBy={labelId} value={value} options={options} names={names} onChange={onChange} />
    </Field>
  );
}
