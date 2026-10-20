"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEY, SYSTEM } from "@/lib/theme-script";
import { THEMES } from "@/lib/themes";

function subscribe(onChange: () => void) {
  window.addEventListener("wordle-theme", onChange);
  return () => window.removeEventListener("wordle-theme", onChange);
}

// The head script sets data-theme-choice before React runs; the server renders "system".
const getChoice = () => document.documentElement.dataset.themeChoice ?? SYSTEM;
const getServerChoice = () => SYSTEM;

export function ThemePicker() {
  const choice = useSyncExternalStore(subscribe, getChoice, getServerChoice);

  function choose(next: string) {
    try {
      if (next === SYSTEM) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
    window.dispatchEvent(new CustomEvent("wordle-theme", { detail: next }));
  }

  const dark = THEMES.filter((theme) => theme.dark);
  const light = THEMES.filter((theme) => !theme.dark);

  return (
    <label className="flex items-center gap-2 text-sm text-subtle">
      Theme
      <select
        value={choice}
        onChange={(event) => choose(event.target.value)}
        suppressHydrationWarning
        className="rounded-md border border-highlight-med bg-overlay px-2 py-1 text-text focus:border-accent focus:outline-none"
      >
        <option value={SYSTEM}>System</option>
        <optgroup label="Dark">
          {dark.map((theme) => (
            <option key={theme.id} value={theme.id}>{theme.name}</option>
          ))}
        </optgroup>
        <optgroup label="Light">
          {light.map((theme) => (
            <option key={theme.id} value={theme.id}>{theme.name}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
