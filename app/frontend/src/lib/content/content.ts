import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { parseArticleFiles, validateParts } from "@/lib/content/parts";
import { blobHash, checkTranslation, staleWarning } from "@/lib/content/translation";

const CONTENT_DIR = path.resolve(process.cwd(), "content");

export type Part = {
  id: string;
  /** 1-based position in the Series. */
  number: number;
  title: string;
  intro: string;
  /** Its Articles, in order. */
  articles: Article[];
};

export type Series = {
  title: string;
  intro: string;
  /** YouTube video id of the video that follows the Series, if there is one yet. */
  video?: string;
  /** In order. */
  parts: Part[];
};

export type Article = {
  /** URL slug: the file name without its `NN-` prefix. */
  slug: string;
  /** The file name without `.mdx` (`05-candidate-set`), for importing the body. */
  fileName: string;
  title: string;
  summary: string;
  /** Slugs of the Articles this one builds on. */
  prerequisites: string[];
  /** Id of the Part it belongs to. */
  part: string;
  /** Its position in the whole Series, from the file name's prefix (shown as two digits, see `formatNumber`). */
  number: number;
  /** Where this Article starts in the Series' video, in seconds. */
  videoStart?: number;
  /** Whether it is written in the language it was loaded for. False for a Thai Series' Article that has no Translation yet: its title and summary are the English ones, and links go to the English page. Always true for English. */
  translated: boolean;
};

export type Content = {
  /** The site's one Series (content/series.mdx). */
  series: Series;
  /** In number order. */
  articles: Article[];
  /** Articles that list the slug as a Prerequisite. */
  backlinks: (slug: string) => Article[];
};

/** One Article file as read: its names and parsed frontmatter, not yet validated. */
export type RawArticle = { slug: string; fileName: string; number: number; file: string; data: Record<string, unknown> };

/** A Translation of one Article as read: only its frontmatter's `title` and `summary` are used. `fileName` (without `.mdx`), when given, must be the English file's. */
export type RawTranslatedArticle = { slug: string; fileName?: string; file: string; data: Record<string, unknown> };

/** A language's own files as read: its Series file (title, intro, Part titles and intros) and the Articles it has translated. */
export type RawTranslation = { seriesFile: string; series: Record<string, unknown>; articles: RawTranslatedArticle[] };

/** The English Series file and Article files as read, not yet validated, and the Translation's files for a language other than English. */
export type RawContent = { seriesFile: string; series: Record<string, unknown>; articles: RawArticle[]; translation?: RawTranslation };

function articleFiles(): RawArticle[] {
  const names = readdirSync(path.join(CONTENT_DIR, "articles")).filter((f) => f.endsWith(".mdx"));
  return parseArticleFiles(names).map((a) => {
    const file = `content/articles/${a.name}.mdx`;
    return { ...a, fileName: a.name, file, data: matter(readFileSync(path.join(CONTENT_DIR, "articles", `${a.name}.mdx`), "utf8")).data };
  });
}

function seriesData(): { file: string; data: Record<string, unknown> } {
  const file = "content/series.mdx";
  return { file, data: matter(readFileSync(path.join(CONTENT_DIR, "series.mdx"), "utf8")).data };
}

/** The Translation checks already warned about, so a dev server (which rebuilds the content on every request) prints each once. */
const warned = new Set<string>();

/**
 * A language's files live in content/<lang>/, mirroring English: `series.mdx` and `articles/NN-slug.mdx`, one per Translation.
 * Each Translation is checked against its English original (`checkTranslation` throws, so the build fails) and a stale `source` hash is
 * printed as a warning. A file with no English original is left for `buildContent` to reject.
 */
function translationFiles(lang: Language, english: RawArticle[]): RawTranslation {
  const file = `content/${lang}/series.mdx`;
  const dir = path.join(CONTENT_DIR, lang, "articles");
  const names = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".mdx")).sort() : [];
  const articles = names.map((n): RawTranslatedArticle => {
    const fileName = n.replace(/\.mdx$/, "");
    const slug = fileName.replace(/^\d{2}-/, "");
    const rel = `content/${lang}/articles/${n}`;
    const parsed = matter(readFileSync(path.join(dir, n), "utf8"));
    const original = english.find((a) => a.slug === slug && a.fileName === fileName);
    if (original) {
      const englishPath = path.join(CONTENT_DIR, "articles", `${original.fileName}.mdx`);
      const bytes = readFileSync(englishPath);
      checkTranslation(rel, matter(bytes.toString("utf8")).content, parsed.content);
      const warning = staleWarning(rel, original.file, parsed.data.source, blobHash(bytes));
      if (warning && !warned.has(warning)) {
        warned.add(warning);
        console.warn(`warning: ${warning}`);
      }
    }
    return { slug, fileName, file: rel, data: parsed.data };
  });
  return { seriesFile: file, series: matter(readFileSync(path.join(CONTENT_DIR, lang, "series.mdx"), "utf8")).data, articles };
}

/** Reads the English files, and the language's own files when it is not English. */
function read(lang: Language): RawContent {
  const { file: seriesFile, data: series } = seriesData();
  const articles = articleFiles();
  return { seriesFile, series, articles, translation: lang === DEFAULT_LANGUAGE ? undefined : translationFiles(lang, articles) };
}

function text(data: Record<string, unknown>, key: string, file: string): string {
  const v = data[key];
  if (typeof v !== "string" || v.trim() === "") throw new Error(`${file}: frontmatter "${key}" must be a non-empty string.`);
  return v;
}

/** `155`, `"2:35"` or `"1:02:03"` to seconds. */
function seconds(v: unknown, file: string): number {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
  if (typeof v === "string" && /^\d+(:\d{1,2}){1,2}$/.test(v)) {
    return v.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  }
  throw new Error(`${file}: frontmatter "video" must be a timestamp such as "2:35" or a number of seconds, got ${JSON.stringify(v)}.`);
}

/** YouTube id from an id or a youtu.be / youtube.com URL. */
function videoId(v: string): string {
  const m = /(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/.exec(v);
  return m ? m[1] : v;
}

type PartDef = { id: string; title: string; intro: string };

/**
 * The Translation's Series title, intro, and Part titles and intros, in the English Parts' order. Its Part ids must be the English ones,
 * in the same order, since the Translation never decides the Series' structure.
 */
function translateSeries({ seriesFile: file, series: td }: RawTranslation, english: PartDef[]): { title: string; intro: string; parts: PartDef[] } {
  const rawParts = td.parts;
  if (!Array.isArray(rawParts)) throw new Error(`${file}: frontmatter "parts" must be a list of {id, title, intro}.`);
  const parts = rawParts.map((p: unknown, i) => {
    const d = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
    const where = `${file} (parts[${i}])`;
    return { id: text(d, "id", where), title: text(d, "title", where), intro: text(d, "intro", where) };
  });
  const ids = parts.map((p) => p.id).join(", ");
  const englishIds = english.map((p) => p.id).join(", ");
  if (ids !== englishIds) throw new Error(`${file}: Part ids [${ids}] must be the English ones [${englishIds}], in the same order.`);
  return { title: text(td, "title", file), intro: text(td, "intro", file), parts };
}

/** The English Articles with the Translations' titles and summaries laid over them. An Article without one keeps its English text and `translated: false`. */
function translateArticles({ articles: translated }: RawTranslation, english: Article[]): Article[] {
  const known = new Set(english.map((a) => a.slug));
  for (const t of translated) {
    if (!known.has(t.slug)) throw new Error(`${t.file}: no English Article "${t.slug}". Known Articles: ${[...known].join(", ")}.`);
  }
  const bySlug = new Map(translated.map((t) => [t.slug, t]));
  return english.map((a) => {
    const t = bySlug.get(a.slug);
    if (!t) return { ...a, translated: false };
    if (t.fileName !== undefined && t.fileName !== a.fileName) {
      throw new Error(`${t.file}: its name must be the English file's, ${a.fileName}.mdx (the number is the Article's place in the Series).`);
    }
    return { ...a, title: text(t.data, "title", t.file), summary: text(t.data, "summary", t.file), translated: true };
  });
}

/** Validates what was read and assembles the Series, Parts and Articles. Pure: no file access, so it can be tested on inline data. */
export function buildContent({ seriesFile, series: sd, articles: raw, translation }: RawContent): Content {
  const rawParts = sd.parts;
  if (!Array.isArray(rawParts) || rawParts.length === 0) {
    throw new Error(`${seriesFile}: frontmatter "parts" must be a non-empty list of {id, title, intro}.`);
  }
  const partDefs = rawParts.map((p: unknown, i) => {
    const d = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
    const where = `${seriesFile} (parts[${i}])`;
    return { id: text(d, "id", where), title: text(d, "title", where), intro: text(d, "intro", where) };
  });

  const articleSlugs = new Set(raw.map((a) => a.slug));
  let articles: Article[] = raw.map(({ slug, fileName, number, file, data }) => {
    const prerequisites = data.prerequisites ?? [];
    if (!Array.isArray(prerequisites) || prerequisites.some((p) => typeof p !== "string")) {
      throw new Error(`${file}: frontmatter "prerequisites" must be a list of Article slugs.`);
    }
    for (const p of prerequisites as string[]) {
      if (p === slug) throw new Error(`${file}: an Article cannot be its own Prerequisite.`);
      if (!articleSlugs.has(p)) {
        throw new Error(`${file}: unknown Prerequisite "${p}". Known Articles: ${[...articleSlugs].join(", ")}.`);
      }
    }
    return {
      slug,
      fileName,
      title: text(data, "title", file),
      summary: text(data, "summary", file),
      prerequisites: prerequisites as string[],
      part: typeof data.part === "string" ? data.part : "",
      number,
      videoStart: data.video === undefined ? undefined : seconds(data.video, file),
      translated: true,
    };
  });

  validateParts(
    partDefs,
    raw.map(({ slug, file, number, data }) => ({ slug, file, part: data.part, number })),
    seriesFile,
  );
  let title = text(sd, "title", seriesFile);
  let intro = text(sd, "intro", seriesFile);
  let parts = partDefs;
  if (translation) {
    ({ title, intro, parts } = translateSeries(translation, partDefs));
    articles = translateArticles(translation, articles);
  }
  const series: Series = {
    title,
    intro,
    video: sd.video === undefined ? undefined : videoId(text(sd, "video", seriesFile)),
    parts: parts.map((p, i) => ({ ...p, number: i + 1, articles: articles.filter((a) => a.part === p.id) })),
  };

  // A Prerequisite cycle would make "builds on" meaningless.
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  const visit = (slug: string, trail: string[]) => {
    if (trail.includes(slug)) throw new Error(`Prerequisite cycle: ${[...trail, slug].join(" -> ")}.`);
    for (const p of bySlug.get(slug)!.prerequisites) visit(p, [...trail, slug]);
  };
  for (const a of articles) visit(a.slug, []);

  return {
    series,
    articles,
    backlinks: (slug) => articles.filter((a) => a.prerequisites.includes(slug)),
  };
}

const cache = new Map<Language, Content>();

/**
 * Reads and validates content/ for a language (English by default). Throws on a bad reference, so the build fails with a clear message.
 * Every language has the same Series, Parts and Articles in the same order; a Translation only replaces text (see `buildContent`).
 */
export function content(lang: Language = DEFAULT_LANGUAGE): Content {
  // No cache in dev, so edits to frontmatter show up on reload.
  if (process.env.NODE_ENV !== "production") return buildContent(read(lang));
  let built = cache.get(lang);
  if (!built) cache.set(lang, (built = buildContent(read(lang))));
  return built;
}

export function youtubeUrl(video: string, start?: number): string {
  return `https://www.youtube.com/watch?v=${video}${start ? `&t=${start}s` : ""}`;
}

export function youtubeEmbedUrl(video: string, start?: number): string {
  return `https://www.youtube-nocookie.com/embed/${video}${start ? `?start=${start}` : ""}`;
}

export function formatTimestamp(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
