/** The site's languages. English is the original and the default; Thai is its Translation (see the Thai Translation spec). */
export const LANGUAGES = ["en", "th"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

/** The `localStorage` key that remembers the language last chosen with the toggle. It never redirects anyone; opening a URL always shows that URL's language. */
export const LANGUAGE_STORAGE_KEY = "wordle-language";
