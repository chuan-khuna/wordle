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
import { DEFAULT_THEME, STORAGE_KEY } from "@/lib/theme/theme-script";
import { THEMES } from "@/lib/theme/themes";

function subscribe(onChange: () => void) {
  window.addEventListener("wordle-theme", onChange);
  return () => window.removeEventListener("wordle-theme", onChange);
}

// The head script sets data-theme before React runs; the server renders the default.
const getChoice = () => document.documentElement.dataset.theme ?? DEFAULT_THEME;
const getServerChoice = () => DEFAULT_THEME;

/**
 * The theme menu: an icon button that opens a radio list of the palettes, Light then Dark,
 * with the current choice checked. The choice is saved in localStorage (`wordle-theme`)
 * and announced with a `wordle-theme` event, which the head script (lib/theme-script.ts) applies.
 */
export function ThemePicker({ align = "start" }: { align?: "start" | "end" }) {
  const choice = useSyncExternalStore(subscribe, getChoice, getServerChoice);

  function choose(next: string) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
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
