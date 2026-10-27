import { readFileSync } from "node:fs";
import path from "node:path";

// The Python package's word lists, two levels above app/frontend (the cwd of `next build` and `next dev`).
const DATA_DIR = path.resolve(process.cwd(), "../../packages/wordle/src/wordle/data");

const readWords = (name: string) => readFileSync(path.join(DATA_DIR, name), "utf8").split(/\r?\n/).filter(Boolean);

let cache: Set<string> | undefined;
let answers: readonly string[] | undefined;

/** The Guess List (it contains the whole Answer List), read once at build time. */
export function guessList(): Set<string> {
  return (cache ??= new Set([...readWords("guesses.txt"), ...answerList()]));
}

/** The Answer List, sorted, read once at build time. */
export function answerList(): readonly string[] {
  return (answers ??= readWords("answers.txt").sort());
}

/** Whether some word fits `pattern`, where `_` is a blank that stands for any letter: `_atch` fits batch. */
export function fitsPattern(pattern: string, words: Iterable<string>): boolean {
  for (const word of words) {
    if (word.length === pattern.length && [...pattern].every((letter, i) => letter === "_" || letter === word[i])) {
      return true;
    }
  }
  return false;
}
