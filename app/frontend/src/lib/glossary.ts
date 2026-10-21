import GLOSSARY from "@content/glossary.json";
import GLOSSARY_TH from "@content/th/glossary.json";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/language";

/** One glossary term and its definition, as copied from the repo's GLOSSARY.md into `content/glossary.json`. */
export type GlossaryEntry = { term: string; definition: string };

/** The entries keyed by lower-cased term, for case-insensitive lookup. */
export function indexGlossary(entries: GlossaryEntry[]): Map<string, GlossaryEntry> {
  return new Map(entries.map((entry) => [entry.term.toLowerCase(), entry]));
}

/** The glossary of each language that has one; the English one is the original. */
const GLOSSARIES: Partial<Record<Language, GlossaryEntry[]>> = { en: GLOSSARY, th: GLOSSARY_TH };

/**
 * Throws, naming the file, when a translated glossary does not have exactly the English term names (a missing term would leave a card
 * empty, an extra one is a typo) or an entry has an empty definition. The term names are the English ones, so the Mark entry
 * also has to keep its `**Correct** (…)` shape.
 */
export function checkGlossary(file: string, english: readonly GlossaryEntry[], translated: readonly GlossaryEntry[]): void {
  const have = new Set(translated.map((e) => e.term));
  const missing = english.filter((e) => !have.has(e.term)).map((e) => e.term);
  const known = new Set(english.map((e) => e.term));
  const extra = translated.filter((e) => !known.has(e.term)).map((e) => e.term);
  if (missing.length) throw new Error(`${file}: missing glossary term${missing.length > 1 ? "s" : ""} ${missing.map((t) => `"${t}"`).join(", ")}. It must have exactly the English term names.`);
  if (extra.length) throw new Error(`${file}: glossary term${extra.length > 1 ? "s" : ""} ${extra.map((t) => `"${t}"`).join(", ")} not in the English glossary. It must have exactly the English term names.`);
  const seen = new Set<string>();
  for (const e of translated) {
    if (seen.has(e.term)) throw new Error(`${file}: glossary term "${e.term}" is defined twice.`);
    seen.add(e.term);
    if (e.definition.trim() === "") throw new Error(`${file}: glossary term "${e.term}" has an empty definition.`);
  }
  const mark = translated.find((e) => e.term === "Mark");
  if (mark) parseMarkKinds(mark.definition);
}

const cache = new Map<Language, Map<string, GlossaryEntry>>();

/** The indexed glossary of a language. Throws, so the build fails, for a language that has no glossary yet. */
export function glossary(lang: Language = DEFAULT_LANGUAGE): Map<string, GlossaryEntry> {
  let index = cache.get(lang);
  if (!index) {
    const entries = GLOSSARIES[lang];
    if (!entries) throw new Error(`lib/glossary.ts: no glossary for language "${lang}".`);
    if (lang !== DEFAULT_LANGUAGE) checkGlossary(`content/${lang}/glossary.json`, GLOSSARY, entries);
    cache.set(lang, (index = indexGlossary(entries)));
  }
  return index;
}

/** The entry for a term (case-insensitive). Throws, so the build fails, when `content/glossary.json` does not define it. */
export function lookupTerm(term: string, lang: Language = DEFAULT_LANGUAGE): GlossaryEntry {
  const entry = glossary(lang).get(term.trim().toLowerCase());
  if (!entry) {
    throw new Error(`<Term>: "${term}" is not defined in content/glossary.json. Add it there, or fix the spelling (use the of="..." prop when the shown text differs).`);
  }
  return entry;
}

/** A piece of a definition: plain text, a bold run (`**…**`), or the text of another glossary term to link. */
export type DefinitionPart = { kind: "text" | "bold"; text: string } | { kind: "term"; text: string; term: string };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A term as it appears in prose: as written, or plural ("Guesses", "Strategies"), matched whole and case-sensitively. */
function termPattern(term: string): string {
  return term.endsWith("y") ? `${escapeRegExp(term.slice(0, -1))}(?:y|ies)` : `${escapeRegExp(term)}(?:es|s)?`;
}

/**
 * Split a definition into parts, linking the first mention of each glossary term in it, so its card can open the
 * term's own card. The longest term wins ("Candidate Set" over "Candidate"); terms in `skip` (the card's own term
 * and the cards it is nested in) stay plain text, and so does a bold run.
 */
export function splitDefinition(definition: string, terms: readonly string[], skip: readonly string[] = []): DefinitionPart[] {
  const skipped = new Set(skip.map((t) => t.toLowerCase()));
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const byPattern = sorted.map((term) => ({ term, re: new RegExp(`^(?:${termPattern(term)})$`) }));
  const any = new RegExp(`\\b(?:${sorted.map(termPattern).join("|")})\\b`, "g");
  const linked = new Set<string>();
  const parts: DefinitionPart[] = [];
  const text = (t: string) => {
    if (!t) return;
    const last = parts[parts.length - 1];
    if (last?.kind === "text") last.text += t;
    else parts.push({ kind: "text", text: t });
  };
  definition.split(/(\*\*[^*]+\*\*)/).forEach((chunk, i) => {
    if (i % 2 === 1) {
      parts.push({ kind: "bold", text: chunk.slice(2, -2) });
      return;
    }
    let at = 0;
    for (const m of chunk.matchAll(any)) {
      const term = byPattern.find((p) => p.re.test(m[0]))!.term;
      const key = term.toLowerCase();
      if (skipped.has(key) || linked.has(key)) continue;
      linked.add(key);
      text(chunk.slice(at, m.index));
      parts.push({ kind: "term", text: m[0], term });
      at = m.index + m[0].length;
    }
    text(chunk.slice(at));
  });
  return parts;
}

export const MARK_KINDS = ["correct", "present", "absent"] as const;
export type MarkKind = (typeof MARK_KINDS)[number];

/**
 * Split the Mark entry's sentence into one definition per kind: each kind is bolded and followed by a
 * parenthetical, as in `**Correct** (in the Answer at this position)`. Throws if one is missing.
 */
export function parseMarkKinds(definition: string): Record<MarkKind, string> {
  const out = {} as Record<MarkKind, string>;
  for (const kind of MARK_KINDS) {
    const name = kind[0].toUpperCase() + kind.slice(1);
    const m = new RegExp(`\\*\\*${name}\\*\\* \\(([^)]+)\\)`).exec(definition);
    if (!m) throw new Error(`<Mark>: the Mark entry in content/glossary.json has no "**${name}** (...)" part, so there is no definition for kind="${kind}".`);
    out[kind] = m[1];
  }
  return out;
}

/** The glossary's definition of one kind of Mark. Throws, so the build fails, for an unknown kind. */
export function lookupMark(kind: string, lang: Language = DEFAULT_LANGUAGE): { name: string; definition: string } {
  if (!(MARK_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`<Mark>: unknown kind "${kind}". Use one of ${MARK_KINDS.map((k) => `"${k}"`).join(", ")}.`);
  }
  const k = kind as MarkKind;
  return { name: k[0].toUpperCase() + k.slice(1), definition: parseMarkKinds(lookupTerm("Mark", lang).definition)[k] };
}
