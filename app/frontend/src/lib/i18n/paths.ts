import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";

/** Thai pages live under this first segment; English paths have none. */
const PREFIX: Partial<Record<Language, string>> = { th: "/th" };

/** The language a site path is in: `/th` and anything under `/th/` is Thai, every other path is English. */
export function languageOf(path: string): Language {
  return /^\/th(\/|$)/.test(path) ? "th" : DEFAULT_LANGUAGE;
}

/**
 * The same page in another language: `/articles/x` to `/th/articles/x`, `/` to `/th`, `/openers` to `/th/openers`,
 * and back. Takes a path in either language, so it also swaps one that is already in the target language (a no-op).
 * Every internal link the pages build goes through it.
 */
export function pathIn(path: string, lang: Language): string {
  const bare = languageOf(path) === DEFAULT_LANGUAGE ? path : path.replace(/^\/th/, "") || "/";
  const prefix = PREFIX[lang];
  if (!prefix) return bare;
  return bare === "/" ? prefix : prefix + bare;
}

/** The path of an Article page. */
export const articlePath = (slug: string, lang: Language = DEFAULT_LANGUAGE) => pathIn(`/articles/${slug}`, lang);
/** The path of the home page. */
export const homePath = (lang: Language = DEFAULT_LANGUAGE) => pathIn("/", lang);
/** The path of the Opener Distribution page. */
export const openersPath = (lang: Language = DEFAULT_LANGUAGE) => pathIn("/openers", lang);
/** The path of the Opener Split page. */
export const openerSplitPath = (lang: Language = DEFAULT_LANGUAGE) => pathIn("/opener-split", lang);
/** The path of the Follow an Answer page. */
export const followPath = (lang: Language = DEFAULT_LANGUAGE) => pathIn("/follow", lang);
/**
 * Where a link to an Article goes from a page in `lang`: its page in that language, or the English page when it has no Translation
 * (a Thai route is not generated for it).
 */
export const articleLink = (a: { slug: string; translated: boolean }, lang: Language = DEFAULT_LANGUAGE) =>
  articlePath(a.slug, a.translated ? lang : DEFAULT_LANGUAGE);
