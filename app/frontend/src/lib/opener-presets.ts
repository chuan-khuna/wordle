/** A named list of Openers to highlight on the Opener Distribution. */
export interface OpenerPreset {
  id: string;
  label: string;
  words: string[];
  /** One line shown under the tabs. */
  caption: string;
}

const BEST = ["tarse", "salet", "crate", "trace", "slate", "crane"];
const MYTHS = ["adieu", "audio", "ouija", "soare", "roate", "raise"];
const BAD = ["qajaq", "xviii", "zhuzh", "jujus", "jazzy", "fuzzy"];

/** The words of several lists, each once, in the order first seen. */
export function unionWords(...lists: readonly (readonly string[])[]): string[] {
  return [...new Set(lists.flat())];
}

/** The tabs, in order. Ranks are for `bits-all` in the Guess Count Matrix summary. */
export const OPENER_PRESETS: readonly OpenerPreset[] = [
  { id: "best", label: "Best Openers", words: BEST, caption: "The top of the ranking when every Opener is played out." },
  {
    id: "myths",
    label: "Myths",
    words: MYTHS,
    caption: "Popular Openers: vowel-heavy starts, and the Expected Information favourites.",
  },
  { id: "bad", label: "Bad Openers", words: BAD, caption: "Rare letters and repeated letters." },
  { id: "all", label: "All", words: unionWords(BEST, MYTHS, BAD), caption: "Every word above." },
];

/** The preset whose words are exactly `words` (order and repeats ignored), if any. */
export function presetFor(words: readonly string[]): OpenerPreset | undefined {
  const wanted = new Set(words);
  if (wanted.size === 0) return undefined;
  return OPENER_PRESETS.find((p) => p.words.length === wanted.size && p.words.every((w) => wanted.has(w)));
}
