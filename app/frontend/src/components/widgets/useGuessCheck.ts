"use client";

import { useEffect, useState } from "react";
import { checkGuess } from "@/lib/api";
import { WORD_LENGTH } from "@/lib/wordle/feedback";

/**
 * Ask the API whether a five-letter word is on the Guess List, a moment after the fifth letter is typed.
 * `error` is the API's message for the current word, or null (not asked yet, being asked, or fine).
 */
export function useGuessCheck(word: string, enabled = true): { checking: boolean; error: string | null } {
  const [result, setResult] = useState<{ word: string; error: string | null } | null>(null);
  const full = enabled && word.length === WORD_LENGTH;
  useEffect(() => {
    if (!full) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      checkGuess(word, ctl.signal).then(
        (error) => setResult({ word, error }),
        () => {},
      );
    }, 200);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [full, word]);
  const current = full && result?.word === word ? result : null;
  return { checking: full && !current, error: current?.error ?? null };
}
