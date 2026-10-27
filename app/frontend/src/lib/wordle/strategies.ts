import type { Pool, Rank, Scope } from "@/lib/api";

/** One of the eight Strategies: a Guess Pool, a Search Scope and a Ranking, as in `wordle.solver.strategy`. */
export interface StrategyInfo {
  /** `<ranking>-<pool>-<scope>`, with the "global" Search Scope written "all". */
  id: string;
  /** The display name, e.g. "Expected Information, Guess List, All words". */
  name: string;
  by: Rank;
  pool: Pool;
  scope: Scope;
}

export const RANKING_NAMES: Record<Rank, string> = { bits: "Expected Information", expected: "Expected Candidates" };
export const POOL_NAMES: Record<Pool, string> = { answers: "Answer List", guesses: "Guess List" };
export const SCOPE_NAMES: Record<Scope, string> = { candidates: "Candidates only", global: "All words" };

/** Each choice's options, in the order the pickers show them. */
export const RANKS: readonly Rank[] = ["bits", "expected"];
export const POOLS: readonly Pool[] = ["answers", "guesses"];
export const SCOPES: readonly Scope[] = ["candidates", "global"];

/** Every combination, ordered by Ranking, then Guess Pool, then Search Scope (the package's `STRATEGIES`). */
export const STRATEGIES: readonly StrategyInfo[] = RANKS.flatMap((by) =>
  POOLS.flatMap((pool) =>
    SCOPES.map((scope) => ({
      id: `${by}-${pool}-${scope === "global" ? "all" : scope}`,
      name: `${RANKING_NAMES[by]}, ${POOL_NAMES[pool]}, ${SCOPE_NAMES[scope]}`,
      by,
      pool,
      scope,
    })),
  ),
);

/** The default Strategy of the website: Expected Information, Guess List, All words. */
export const DEFAULT_STRATEGY = "bits-guesses-all";

/** The Guess Pool and Search Scope part of the name, for a picker that already groups by Ranking. */
export const shortName = (s: StrategyInfo) => `${POOL_NAMES[s.pool]}, ${SCOPE_NAMES[s.scope]}`;

/** The Strategies grouped by Ranking, in order: one group per Ranking, with its name. */
export const STRATEGY_GROUPS: readonly { by: Rank; label: string; strategies: StrategyInfo[] }[] = RANKS.map((by) => ({
  by,
  label: RANKING_NAMES[by],
  strategies: STRATEGIES.filter((s) => s.by === by),
}));

/** The Strategy a Ranking, Guess Pool and Search Scope make up (every combination is one). */
export const strategyFor = (by: Rank, pool: Pool, scope: Scope): StrategyInfo =>
  STRATEGIES.find((s) => s.by === by && s.pool === pool && s.scope === scope)!;

/** The Strategy with this id, or undefined. */
export const strategyById = (id: string): StrategyInfo | undefined => STRATEGIES.find((s) => s.id === id);
