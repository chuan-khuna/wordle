/**
 * The compact text format for a State in Widget props and URLs:
 * rows separated by commas, each `guess:feedback`, e.g. `crane:00102,slate:01200`.
 * A row without `:feedback` starts all Absent (`00000`). Anything malformed is dropped.
 */
import { type Mark, WORD_LENGTH, marksToString, parseMarks } from "../wordle/feedback";

export interface Row {
  guess: string;
  marks: Mark[];
}

export const MAX_ROWS = 6;

export function parseState(text: string | null | undefined): Row[] {
  const rows: Row[] = [];
  for (const part of (text ?? "").split(",")) {
    const [word = "", digits] = part.trim().toLowerCase().split(":");
    if (!/^[a-z]{1,5}$/.test(word)) continue;
    const marks = digits === undefined ? null : parseMarks(digits);
    if (digits !== undefined && marks === null) continue;
    rows.push({ guess: word, marks: marks ?? (Array(WORD_LENGTH).fill(0) as Mark[]) });
    if (rows.length === MAX_ROWS) break;
  }
  return rows;
}

export function formatState(rows: readonly Row[]): string {
  return rows
    .filter((r) => r.guess.length > 0)
    .map((r) => `${r.guess}:${marksToString(r.marks)}`)
    .join(",");
}
