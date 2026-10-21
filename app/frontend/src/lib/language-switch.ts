import { DEFAULT_LANGUAGE, type Language } from "@/lib/language";
import { pathIn } from "@/lib/paths";

/**
 * Where the toggle goes from `pathname` to the page in language `to`, or null when that page does not exist: a Thai page exists
 * for the home page, the Opener Distribution page and the Articles in `translatedSlugs`, never for anything else (an untranslated
 * Article has no Thai route, so linking to one would be broken). Every English page exists, since a Thai page is always an
 * English page's Translation.
 */
export function switchTarget(pathname: string, to: Language, translatedSlugs: readonly string[]): string | null {
  const english = pathIn(pathname, DEFAULT_LANGUAGE);
  if (to === DEFAULT_LANGUAGE) return english;
  if (english === "/" || english === "/openers") return pathIn(english, to);
  const slug = /^\/articles\/([^/]+)$/.exec(english)?.[1];
  return slug && translatedSlugs.includes(slug) ? pathIn(english, to) : null;
}
