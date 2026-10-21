/**
 * The pure logic of the State input (components/widgets/StateBoard.tsx), after the gpui app's Solver mode
 * (app/wordle-gpui/src/solver/assist.rs): rows of Guesses whose Marks are clicked in, and a Guess being typed.
 * Whether a typed word is on the Guess List is checked by the caller (the API); `enterGuess` only adds it.
 */
import { type Mark, WORD_LENGTH } from "../wordle/feedback";
import { MAX_ROWS, type Row, parseState } from "./widget-state";

export interface Board {
  /** The State: each Guess entered, with the Marks clicked in so far (all Absent when entered). */
  rows: Row[];
  /** The letters of the Guess being typed, not yet entered. */
  typed: string;
}

export const nextMark = (mark: Mark): Mark => ((mark + 1) % 3) as Mark;

/** The rows of a `guess:feedback,...` text that have all five letters (a partial word cannot be a Guess). */
export function rowsFromState(text: string | null | undefined): Row[] {
  return parseState(text).filter((r) => r.guess.length === WORD_LENGTH);
}

/** Whether the last Guess is all Correct: the game was won, so nothing more can be entered. */
export function isWin(rows: readonly Row[]): boolean {
  const last = rows[rows.length - 1];
  return last !== undefined && last.marks.every((m) => m === 2);
}

/** Whether another Guess can be typed: not won, and under six Guesses. */
export function canType(rows: readonly Row[]): boolean {
  return !isWin(rows) && rows.length < MAX_ROWS;
}

/** Add a letter to the Guess being typed (letters only, at most five, only while a Guess can be typed). */
export function typeLetter(board: Board, key: string): Board {
  if (!/^[a-zA-Z]$/.test(key) || !canType(board.rows) || board.typed.length >= WORD_LENGTH) return board;
  return { ...board, typed: board.typed + key.toLowerCase() };
}

/** Remove the last typed letter. With nothing typed, take the last Guess back into the typing row to edit. */
export function backspace(board: Board): Board {
  if (board.typed.length > 0) return { ...board, typed: board.typed.slice(0, -1) };
  const last = board.rows[board.rows.length - 1];
  if (!last) return board;
  return { rows: board.rows.slice(0, -1), typed: last.guess };
}

/** Enter the typed Guess (five letters, already known to be on the Guess List) as a new row, all Absent. */
export function enterGuess(board: Board): Board {
  if (board.typed.length !== WORD_LENGTH || !canType(board.rows)) return board;
  const row: Row = { guess: board.typed, marks: Array<Mark>(WORD_LENGTH).fill(0) };
  return { rows: [...board.rows, row], typed: "" };
}

/** Move the tile at `position` of row `row` on to its next Mark: Absent, Present, Correct, Absent. */
export function cycleMark(board: Board, row: number, position: number): Board {
  const target = board.rows[row];
  if (!target || position < 0 || position >= WORD_LENGTH) return board;
  const marks = [...target.marks];
  marks[position] = nextMark(marks[position]);
  return { ...board, rows: board.rows.map((r, i) => (i === row ? { ...r, marks } : r)) };
}

/** Clear the State and the typing row. */
export const startOver = (): Board => ({ rows: [], typed: "" });
