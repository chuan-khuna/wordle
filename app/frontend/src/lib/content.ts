import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parseArticleFiles, validateParts } from "@/lib/parts";

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
};

export type Content = {
  /** The site's one Series (content/series.mdx). */
  series: Series;
  /** In number order. */
  articles: Article[];
  /** Articles that list the slug as a Prerequisite. */
  backlinks: (slug: string) => Article[];
};

function articleFiles(): { slug: string; fileName: string; number: number; file: string; data: Record<string, unknown> }[] {
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

function load(): Content {
  const { file: seriesFile, data: sd } = seriesData();
  const rawParts = sd.parts;
  if (!Array.isArray(rawParts) || rawParts.length === 0) {
    throw new Error(`${seriesFile}: frontmatter "parts" must be a non-empty list of {id, title, intro}.`);
  }
  const partDefs = rawParts.map((p: unknown, i) => {
    const d = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
    const where = `${seriesFile} (parts[${i}])`;
    return { id: text(d, "id", where), title: text(d, "title", where), intro: text(d, "intro", where) };
  });

  const raw = articleFiles();
  const articleSlugs = new Set(raw.map((a) => a.slug));
  const articles: Article[] = raw.map(({ slug, fileName, number, file, data }) => {
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
    };
  });

  validateParts(
    partDefs,
    raw.map(({ slug, file, number, data }) => ({ slug, file, part: data.part, number })),
    seriesFile,
  );
  const series: Series = {
    title: text(sd, "title", seriesFile),
    intro: text(sd, "intro", seriesFile),
    video: sd.video === undefined ? undefined : videoId(text(sd, "video", seriesFile)),
    parts: partDefs.map((p, i) => ({ ...p, number: i + 1, articles: articles.filter((a) => a.part === p.id) })),
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

let cache: Content | undefined;

/** Reads and validates content/. Throws on a bad reference, so the build fails with a clear message. */
export function content(): Content {
  // No cache in dev, so edits to frontmatter show up on reload.
  if (process.env.NODE_ENV === "production") return (cache ??= load());
  return load();
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
