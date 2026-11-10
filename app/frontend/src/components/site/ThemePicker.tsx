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
 * each with a swatch of its background and accent, correct and present colours, and the current choice checked. The choice is saved in localStorage (`wordle-theme`)
 * and announced with a `wordle-theme` event, which the head script (lib/theme-script.ts) applies.
 */
/**
 * A small preview of a palette: its background with three dots, its accent, correct and
 * present colours. `data-theme` on the swatch scopes that palette's variables to it, so no
 * colours are repeated here.
 */
function ThemeSwatch({ id }: { id: string }) {
  return (
    <span
      data-theme={id}
      aria-hidden="true"
      className="flex h-5 shrink-0 items-center -space-x-1 rounded-sm border border-highlight-high bg-background px-1"
    >
      {/* Overlapping dots, each ringed in the background so the overlap reads as a cut. */}
      <span className="size-2.5 rounded-full bg-accent ring-1 ring-background" />
      <span className="size-2.5 rounded-full bg-correct ring-1 ring-background" />
      <span className="size-2.5 rounded-full bg-present ring-1 ring-background" />
    </span>
  );
}

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
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuRadioGroup value={choice} onValueChange={choose}>
          <DropdownMenuLabel>Light</DropdownMenuLabel>
          {light.map((theme) => (
            <DropdownMenuRadioItem key={theme.id} value={theme.id} className="gap-2">
              <ThemeSwatch id={theme.id} />
              {theme.name}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Dark</DropdownMenuLabel>
          {dark.map((theme) => (
            <DropdownMenuRadioItem key={theme.id} value={theme.id} className="gap-2">
              <ThemeSwatch id={theme.id} />
              {theme.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
