import { STRATEGIES } from "@/lib/strategies";

/** The fewest and most boards the Side-by-side Game shows. */
export const MIN_BOARDS = 2;
export const MAX_BOARDS = 4;

/** Beats the finished boards stay up before the next Answer. */
export const HOLD_BEATS = 3;

/** The Answers to loop through: five-letter words, comma or space separated, repeats dropped; `fallback` when none. */
export function parseAnswers(text: string, fallback: readonly string[]): string[] {
  const words = text
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => /^[a-z]{5}$/.test(w));
  return words.length > 0 ? [...new Set(words)] : [...fallback];
}

/**
 * The Strategy ids of the boards, in the given order: known ids only (a Strategy may appear once), at most
 * `MAX_BOARDS`. Fewer than `MIN_BOARDS` means `fallback`.
 */
export function parseBoards(text: string, fallback: readonly string[]): string[] {
  const known = new Set(STRATEGIES.map((s) => s.id));
  const ids = [
    ...new Set(
      text
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((i) => known.has(i)),
    ),
  ].slice(0, MAX_BOARDS);
  return ids.length >= MIN_BOARDS ? ids : [...fallback];
}

/** The first Strategy not yet on a board, for "Add a Strategy". */
export function nextStrategy(boards: readonly string[]): string | undefined {
  return STRATEGIES.find((s) => !boards.includes(s.id))?.id;
}

/** How many Guesses a board with `guesses` Guesses shows at beat `beat` (beat 0 is the empty board). */
export const revealed = (beat: number, guesses: number) => Math.min(Math.max(beat, 0), guesses);

/** The beats one Answer takes: one per Guess of its longest Game, then the hold. */
export const beatsFor = (longest: number) => longest + HOLD_BEATS;
