import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Language } from "@/lib/i18n/language";
import { createSlugger } from "./rehype-heading-ids.mjs";

/** A `##` (depth 2) or `###` (depth 3) heading of an Article, with the id `rehype-heading-ids` gives it. */
export type Heading = { depth: 2 | 3; text: string; id: string };

/** Inline Markdown in a heading, as plain text: code, emphasis and link syntax dropped, the words kept. */
function plain(text: string) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

/** The `##` and `###` headings of an MDX body, in order, skipping fenced code blocks. Pure. */
export function headingsOf(body: string): Heading[] {
  const slug = createSlugger();
  const out: Heading[] = [];
  let fence: string | null = null;
  for (const line of body.split("\n")) {
    const open = line.match(/^\s*(`{3,}|~{3,})/);
    if (open) {
      if (fence === null) fence = open[1];
      else if (line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = plain(m[2]);
    out.push({ depth: m[1].length as 2 | 3, text, id: slug(text) });
  }
  return out;
}

/** The headings of one Article's file in a language (the Translation for Thai). */
export function articleHeadings(fileName: string, lang: Language): Heading[] {
  const dir = lang === "en" ? "articles" : path.join(lang, "articles");
  const file = path.resolve(process.cwd(), "content", dir, `${fileName}.mdx`);
  return headingsOf(matter(readFileSync(file, "utf8")).content);
}
