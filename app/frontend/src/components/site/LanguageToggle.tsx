"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { LANGUAGE_STORAGE_KEY, type Language } from "@/lib/i18n/language";
import { switchTarget } from "@/lib/i18n/language-switch";
import { pageText } from "@/lib/i18n/page-text";

const OPTIONS: { lang: Language; label: string }[] = [
  { lang: "en", label: "EN" },
  { lang: "th", label: "ไทย" },
];

const base = "rounded-sm px-2 py-1 text-xs font-medium leading-none";

/**
 * The EN / ไทย toggle, beside the theme menu: two links in a labelled group, the current language marked `aria-current`, the other
 * linking to the same page in that language (`switchTarget`). When that page does not exist (an English Article with no Translation)
 * the option is shown disabled, still focusable, with a short visible note under the toggle that the group's description points at, and is never a link.
 * Clicking a link saves the choice in `localStorage` (inside try/catch) and nothing reads it to redirect: a URL always opens in its own language.
 */
export function LanguageToggle({ lang, translatedSlugs }: { lang: Language; translatedSlugs: readonly string[] }) {
  const pathname = usePathname();
  const text = pageText(lang);
  const noteId = useId();
  const names: Record<Language, string> = { en: text.englishName, th: text.thaiName };
  const missing = OPTIONS.some((o) => o.lang !== lang && switchTarget(pathname, o.lang, translatedSlugs) === null);

  function remember(next: Language) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the page the link opens is in the right language anyway.
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
    <div role="group" aria-label={text.language} aria-describedby={missing ? noteId : undefined} className="flex items-center gap-0.5 rounded-md border border-rule p-0.5">
      {OPTIONS.map(({ lang: option, label }) => {
        const common = { lang: option === "th" ? "th" : "en", "aria-label": names[option] };
        if (option === lang) {
          return (
            <span key={option} {...common} aria-current="true" className={`${base} bg-highlight-med text-text`}>
              {label}
            </span>
          );
        }
        const target = switchTarget(pathname, option, translatedSlugs);
        if (target === null) {
          return (
            <span key={option} {...common} role="link" aria-disabled="true" tabIndex={0} title={text.notInThai} className={`${base} cursor-not-allowed text-subtle`}>
              {label}
            </span>
          );
        }
        return (
          <Link key={option} href={target} {...common} onClick={() => remember(option)} className={`${base} text-meta hover:bg-highlight-low hover:text-text`}>
            {label}
          </Link>
        );
      })}
    </div>
      {missing && (
        <span id={noteId} className="whitespace-nowrap text-xs leading-none text-meta">
          {text.notInThai}
        </span>
      )}
    </div>
  );
}
