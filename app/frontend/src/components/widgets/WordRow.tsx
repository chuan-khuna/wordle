"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { WORD_LENGTH } from "@/lib/feedback";
import { cn } from "@/lib/utils";

/** Lowercase letters only, at most five. */
export function cleanWord(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, "").slice(0, WORD_LENGTH);
}

/**
 * A word input drawn as a row of five tiles, like a row of the Wordle board. It is one focusable control: a
 * visually hidden text input (labelled, `maxLength` 5) drives the tiles, so the keyboard, the phone's on-screen
 * keyboard, paste and screen readers all work. Clicking or tapping the row focuses the input.
 *
 * - Letters fill the tiles left to right; Backspace removes the last one; Enter calls `onEnter` (only with five
 *   letters; with fewer the row shakes and says so).
 * - The next tile to fill shows a caret while the row is focused.
 * - `error` (for example the API's "not on the Guess List") shows under the row and turns the tiles red; the row
 *   shakes once when a message appears (not with `prefers-reduced-motion`).
 * - `onBackspaceEmpty` runs on Backspace with nothing typed (the State input pulls the last Guess back).
 */
export function WordRow({
  id,
  label,
  hideLabel,
  value,
  onChange,
  onEnter,
  onBackspaceEmpty,
  keepFocus,
  error,
  hint,
  className,
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (word: string) => void;
  onEnter?: (word: string) => void;
  onBackspaceEmpty?: () => void;
  /** Keep the keyboard open after Enter (the State input goes on typing). By default Enter puts it away on phones. */
  keepFocus?: boolean;
  /** Why the word is refused, or null. */
  error?: string | null;
  /** Quiet help under the row while there is no error. */
  hint?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [short, setShort] = useState(false);
  const [shake, setShake] = useState(0);
  const [seen, setSeen] = useState<string | null>(null);

  const message = error ?? (short ? "Type all five letters." : null);
  // A message that newly appears (or changes) shakes the row. Adjusting state while rendering is the React way
  // to derive this without an effect.
  if (message !== seen) {
    setSeen(message);
    if (message) setShake((n) => n + 1);
  }

  const caret = Math.min(value.length, WORD_LENGTH - 1);
  const describedBy = message ? `${id}-msg` : hint ? `${id}-msg` : undefined;

  return (
    <div className={className}>
      <Label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1.5 block text-sm font-normal text-meta"}>
        {label}
      </Label>
      <div
        className="relative inline-block cursor-text"
        onMouseDown={(e) => {
          // Keep the input focused when the tiles are pressed; the click focuses it when it is not.
          if (e.target !== input.current) e.preventDefault();
        }}
        onClick={() => input.current?.focus()}
      >
        <input
          ref={input}
          id={id}
          value={value}
          maxLength={WORD_LENGTH}
          inputMode="text"
          enterKeyHint="done"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="sr-only text-base"
          onSelect={(e) => {
            // The tiles have no caret to move, so letters always go to the end (Ctrl-A on a Mac, a touch, ...).
            const el = e.currentTarget;
            const end = el.value.length;
            if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setShort(false);
            onChange(cleanWord(e.target.value));
          }}
          onKeyDown={(e) => {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            if (e.key === "Enter") {
              e.preventDefault();
              if (value.length < WORD_LENGTH) {
                setShort(true);
                setShake((n) => n + 1);
              } else if (error) {
                setShake((n) => n + 1);
              } else {
                onEnter?.(value);
                // Done typing on a phone: put the keyboard away. (The State input keeps typing.)
                if (!keepFocus) input.current?.blur();
              }
            } else if (e.key === "Backspace" && value === "") {
              e.preventDefault();
              onBackspaceEmpty?.();
            } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              // The tiles have no movable caret: letters always go to the end.
              e.preventDefault();
            }
          }}
        />
        <div key={shake} className={cn("flex gap-1.5", shake > 0 && "animate-shake")} aria-hidden="true">
          {Array.from({ length: WORD_LENGTH }, (_, i) => {
            const letter = value[i] ?? "";
            const next = focused && i === caret;
            return (
              <span
                key={i}
                className={cn(
                  "relative inline-flex h-12 w-12 items-center justify-center rounded-md border-2 font-mono text-2xl font-semibold uppercase select-none sm:h-14 sm:w-14",
                  error ? "border-error text-error" : letter ? "border-text text-text" : "border-rule-strong",
                  next && "outline-2 outline-offset-2 outline-accent",
                )}
              >
                {letter}
                {next && !letter && <span className="absolute h-6 w-0.5 bg-text motion-safe:animate-pulse" />}
              </span>
            );
          })}
        </div>
      </div>
      {(message || hint) && (
        <p id={`${id}-msg`} role={message ? "alert" : undefined} className={cn("mt-1.5 text-sm", message ? "text-error" : "text-meta")}>
          {message ?? hint}
        </p>
      )}
    </div>
  );
}
