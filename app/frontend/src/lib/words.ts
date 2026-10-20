import { readFileSync } from "node:fs";
import path from "node:path";

// The Python package's Guess List, two levels above app/frontend (the cwd of `next build` and `next dev`).
const GUESSES_PATH = path.resolve(process.cwd(), "../../packages/wordle/src/wordle/data/guesses.txt");

let cache: Set<string> | undefined;

/** The Guess List (it contains the whole Answer List), read once at build time. */
export function guessList(): Set<string> {
  return (cache ??= new Set(readFileSync(GUESSES_PATH, "utf8").split(/\r?\n/).filter(Boolean)));
}
