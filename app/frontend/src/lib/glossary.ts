import { readFileSync } from "node:fs";
import path from "node:path";

export type GlossaryEntry = { term: string; definition: string };

// The repo's GLOSSARY.md, two levels above app/frontend (the cwd of `next build` and `next dev`).
const GLOSSARY_PATH = path.resolve(process.cwd(), "../../GLOSSARY.md");

/**
 * Parse `**Term**:` lines and the definition lines under them, up to a blank line.
 * `_Avoid_:` lines are not part of the definition. Keys are lower-cased for lookup.
 */
export function parseGlossary(markdown: string): Map<string, GlossaryEntry> {
  const entries = new Map<string, GlossaryEntry>();
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\*\*(.+?)\*\*:\s*$/.exec(lines[i]);
    if (!m) continue;
    const body: string[] = [];
    for (i++; i < lines.length && lines[i].trim() !== ""; i++) {
      if (/^_Avoid_:/.test(lines[i])) continue;
      body.push(lines[i].trim());
    }
    entries.set(m[1].toLowerCase(), { term: m[1], definition: body.join(" ") });
  }
  return entries;
}

let cache: Map<string, GlossaryEntry> | undefined;

export function glossary(): Map<string, GlossaryEntry> {
  return (cache ??= parseGlossary(readFileSync(GLOSSARY_PATH, "utf8")));
}

/** The entry for a term (case-insensitive). Throws, so the build fails, when GLOSSARY.md does not define it. */
export function lookupTerm(term: string): GlossaryEntry {
  const entry = glossary().get(term.trim().toLowerCase());
  if (!entry) {
    throw new Error(`<Term>: "${term}" is not defined in GLOSSARY.md. Add it there, or fix the spelling (use the of="..." prop when the shown text differs).`);
  }
  return entry;
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
    if (!m) throw new Error(`<Mark>: the Mark entry in GLOSSARY.md has no "**${name}** (...)" part, so there is no definition for kind="${kind}".`);
    out[kind] = m[1];
  }
  return out;
}

/** The glossary's definition of one kind of Mark. Throws, so the build fails, for an unknown kind. */
export function lookupMark(kind: string): { name: string; definition: string } {
  if (!(MARK_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`<Mark>: unknown kind "${kind}". Use one of ${MARK_KINDS.map((k) => `"${k}"`).join(", ")}.`);
  }
  const k = kind as MarkKind;
  return { name: k[0].toUpperCase() + k.slice(1), definition: parseMarkKinds(lookupTerm("Mark").definition)[k] };
}
