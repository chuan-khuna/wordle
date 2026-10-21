/** Pure checks and formatting for Parts and Article numbers (no file access, so they are unit-tested). */

/** An Article number is always two digits with leading zeros: 1 becomes "01". */
export function formatNumber(n: number): string {
  return String(n).padStart(2, "0");
}

type PartRef = { id: string };
type ArticleRef = { slug: string; file: string; part: unknown; number: number };

/**
 * Throws, naming the file, on a missing or unknown Part, a Part with no Articles, or a Part whose
 * Articles are not consecutive in number. `articles` may come in any order.
 */
export function validateParts(parts: PartRef[], articles: ArticleRef[], seriesFile: string): void {
  const ids = new Set<string>();
  for (const p of parts) {
    if (ids.has(p.id)) throw new Error(`${seriesFile}: Part id "${p.id}" is used twice.`);
    ids.add(p.id);
  }
  const known = parts.map((p) => p.id).join(", ");
  for (const a of articles) {
    if (a.part === undefined || a.part === null || a.part === "") {
      throw new Error(`${a.file}: frontmatter "part" is missing. Known Parts: ${known}.`);
    }
    if (typeof a.part !== "string" || !ids.has(a.part)) {
      throw new Error(`${a.file}: unknown Part ${JSON.stringify(a.part)}. Known Parts: ${known}.`);
    }
  }
  const sorted = [...articles].sort((a, b) => a.number - b.number);
  for (const p of parts) {
    const mine = sorted.filter((a) => a.part === p.id);
    if (mine.length === 0) throw new Error(`${seriesFile}: Part "${p.id}" has no Articles.`);
    // Consecutive in `order` means no Article of another Part sits between two of this Part's.
    const first = sorted.indexOf(mine[0]);
    const last = sorted.indexOf(mine[mine.length - 1]);
    if (last - first + 1 !== mine.length) {
      const stray = sorted.slice(first, last + 1).find((a) => a.part !== p.id)!;
      throw new Error(
        `${stray.file}: Part "${p.id}" is not consecutive in number: "${stray.slug}" (number ${stray.number}, Part "${String(stray.part)}") sits between its Articles.`,
      );
    }
  }
}

export type ArticleFile = { name: string; number: number; slug: string };

/**
 * Article files are named `NN-slug.mdx`: the two-digit prefix is the Article's number in the Series, the rest
 * is its URL slug. Throws, naming the file, on a bad prefix, a repeated number or slug, or numbers that
 * are not exactly 01..N. `names` are file names with the `.mdx` extension.
 */
export function parseArticleFiles(names: string[], dir = "content/articles"): ArticleFile[] {
  const out: ArticleFile[] = names.map((f) => {
    const m = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/.exec(f);
    if (!m) {
      throw new Error(`${dir}/${f}: Article file names must be NN-slug.mdx (exactly two digits, a dash, then a lowercase slug), e.g. 01-rules.mdx.`);
    }
    return { name: f.slice(0, -4), number: Number(m[1]), slug: m[2] };
  });
  out.sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
  const slugs = new Map<string, string>();
  out.forEach((a, i) => {
    const prev = out[i - 1];
    if (prev && prev.number === a.number) {
      throw new Error(`${dir}/${a.name}.mdx: number ${formatNumber(a.number)} is also used by ${prev.name}.mdx.`);
    }
    if (slugs.has(a.slug)) {
      throw new Error(`${dir}/${a.name}.mdx: slug "${a.slug}" is also used by ${slugs.get(a.slug)}.mdx.`);
    }
    slugs.set(a.slug, a.name);
    if (a.number !== i + 1) {
      throw new Error(`${dir}/${a.name}.mdx: numbers must run 01..${formatNumber(out.length)} with no gaps; expected ${formatNumber(i + 1)} here.`);
    }
  });
  return out;
}
