import { barOf } from "@/lib/opener-bars";

interface Row {
  rank: number;
  word: string;
  average_guess_count: number;
  losses: number;
  is_answer: boolean;
}

export type OpenerLookup<T extends Row> =
  /** Fewer than five letters typed (or none): nothing to look up yet. */
  | { kind: "incomplete" }
  /** Not among the Openers played (not in the Strategy's Guess Pool, or its row is not finished yet). */
  | { kind: "unknown"; word: string }
  | {
      kind: "found";
      opener: T;
      /** How many Openers were played. */
      of: number;
      /** Its bar, in hundredths. */
      hundredths: number;
      /** How many charted Openers share its bar. */
      inBar: number;
      /** On the chart? False when the Answer List filter hides it. */
      charted: boolean;
    };

/** Look up the typed word among the Openers (best first) and work out its stats and its bar. */
export function lookupOpener<T extends Row>(openers: readonly T[], query: string, answersOnly: boolean): OpenerLookup<T> {
  const word = query.trim().toLowerCase();
  if (!/^[a-z]{5}$/.test(word)) return { kind: "incomplete" };
  const opener = openers.find((o) => o.word === word);
  if (!opener) return { kind: "unknown", word };
  const hundredths = barOf(opener.average_guess_count);
  const inBar = openers.filter((o) => (!answersOnly || o.is_answer) && barOf(o.average_guess_count) === hundredths).length;
  return { kind: "found", opener, of: openers.length, hundredths, inBar, charted: !answersOnly || opener.is_answer };
}

/** Lookups for a card list: the found words by rank, best first, then the unknown ones in the order given. */
export function sortLookups<T extends Row>(lookups: readonly OpenerLookup<T>[]): OpenerLookup<T>[] {
  const found = lookups.flatMap((l) => (l.kind === "found" ? [l] : []));
  const unknown = lookups.filter((l) => l.kind === "unknown");
  return [...found.sort((a, b) => a.opener.rank - b.opener.rank), ...unknown];
}
