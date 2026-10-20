"use client";

import { PaletteIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STORAGE_KEY, SYSTEM } from "@/lib/theme-script";
import { THEMES } from "@/lib/themes";

function subscribe(onChange: () => void) {
  window.addEventListener("wordle-theme", onChange);
  return () => window.removeEventListener("wordle-theme", onChange);
}

// The head script sets data-theme-choice before React runs; the server renders "system".
const getChoice = () => document.documentElement.dataset.themeChoice ?? SYSTEM;
const getServerChoice = () => SYSTEM;

/**
 * The theme menu: an icon button that opens a radio list of "System" and the palettes, Light then Dark,
 * with the current choice checked. The choice is saved in localStorage (`wordle-theme`; System removes it)
 * and announced with a `wordle-theme` event, which the head script (lib/theme-script.ts) applies.
 */
export function ThemePicker({ align = "start" }: { align?: "start" | "end" }) {
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

  const light = THEMES.filter((theme) => !theme.dark);
  const dark = THEMES.filter((theme) => theme.dark);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme" title="Theme">
          <PaletteIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuRadioGroup value={choice} onValueChange={choose}>
          <DropdownMenuRadioItem value={SYSTEM}>System</DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Light</DropdownMenuLabel>
          {light.map((theme) => (
            <DropdownMenuRadioItem key={theme.id} value={theme.id}>
              {theme.name}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Dark</DropdownMenuLabel>
          {dark.map((theme) => (
            <DropdownMenuRadioItem key={theme.id} value={theme.id}>
              {theme.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
