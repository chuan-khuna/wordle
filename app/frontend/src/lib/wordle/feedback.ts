/**
 * A TypeScript port of `feedback(guess, answer)` (packages/wordle/src/wordle/engine/feedback.py),
 * plus the step-by-step trace the Feedback scorer Widget shows. See docs/documents/feedback-scoring.md.
 * Marks are digits: 0 Absent, 1 Present, 2 Correct.
 */

export type Mark = 0 | 1 | 2;
export const MARK_NAMES = ["Absent", "Present", "Correct"] as const;
export const WORD_LENGTH = 5;

export interface Pass2Step {
  index: number;
  letter: string;
  /** Unused copies of this letter in the Answer before this step. */
  available: number;
  mark: 0 | 1;
}

export interface FeedbackTrace {
  marks: Mark[];
  /** Pass 1: which positions are Correct. */
  correct: boolean[];
  /** Answer letters left after pass 1, as letter -> unused copies (only letters with copies left). */
  unused: Record<string, number>;
  /** Pass 2: one step per non-Correct position, left to right. */
  steps: Pass2Step[];
}

/** Score and trace a Guess against an Answer (both five lowercase letters). */
export function traceFeedback(guess: string, answer: string): FeedbackTrace {
  if (guess.length !== WORD_LENGTH || answer.length !== WORD_LENGTH) {
    throw new Error(`words must have ${WORD_LENGTH} letters`);
  }
  const marks: Mark[] = Array(WORD_LENGTH).fill(0);
  const correct = Array<boolean>(WORD_LENGTH).fill(false);
  const left: Record<string, number> = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      marks[i] = 2;
      correct[i] = true;
    } else {
      left[answer[i]] = (left[answer[i]] ?? 0) + 1;
    }
  }
  const unused = { ...left };
  const steps: Pass2Step[] = [];
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (correct[i]) continue;
    const available = left[guess[i]] ?? 0;
    if (available > 0) {
      marks[i] = 1;
      left[guess[i]] = available - 1;
    }
    steps.push({ index: i, letter: guess[i], available, mark: available > 0 ? 1 : 0 });
  }
  return { marks, correct, unused, steps };
}

export function scoreFeedback(guess: string, answer: string): Mark[] {
  return traceFeedback(guess, answer).marks;
}

/** Marks as the API's digit string, e.g. "20102". */
export function marksToString(marks: readonly number[]): string {
  return marks.join("");
}

/** A digit string of five 0/1/2 digits as Marks, or null if malformed. */
export function parseMarks(text: string): Mark[] | null {
  return /^[012]{5}$/.test(text) ? ([...text].map(Number) as Mark[]) : null;
}
