import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.resolve(process.cwd(), "content");

export type Series = {
  slug: string;
  title: string;
  intro: string;
  /** YouTube video id of the video that follows this Series. */
  video?: string;
};

export type Article = {
  slug: string;
  title: string;
  summary: string;
  /** Slugs of the Articles this one builds on. */
  prerequisites: string[];
  series: string;
  order: number;
  /** Where this Article starts in its Series' video, in seconds. */
  videoStart?: number;
};

export type Content = {
  series: Series[];
  /** Sorted by Series, then `order`. */
  articles: Article[];
  /** Articles that list the slug as a Prerequisite. */
  backlinks: (slug: string) => Article[];
  /** The Articles of a Series, in `order`. */
  inSeries: (series: string) => Article[];
};

function files(dir: string): { slug: string; file: string; data: Record<string, unknown> }[] {
  return readdirSync(path.join(CONTENT_DIR, dir))
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((f) => {
      const file = `content/${dir}/${f}`;
      return { slug: f.slice(0, -4), file, data: matter(readFileSync(path.join(CONTENT_DIR, dir, f), "utf8")).data };
    });
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
  const series: Series[] = files("series").map(({ slug, file, data }) => ({
    slug,
    title: text(data, "title", file),
    intro: text(data, "intro", file),
    video: data.video === undefined ? undefined : videoId(text(data, "video", file)),
  }));
  const seriesSlugs = new Set(series.map((s) => s.slug));

  const raw = files("articles");
  const articleSlugs = new Set(raw.map((a) => a.slug));
  const articles: Article[] = raw.map(({ slug, file, data }) => {
    const seriesSlug = text(data, "series", file);
    if (!seriesSlugs.has(seriesSlug)) {
      throw new Error(`${file}: unknown series "${seriesSlug}". Known Series: ${[...seriesSlugs].join(", ") || "(none)"}.`);
    }
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
    if (typeof data.order !== "number" || !Number.isInteger(data.order)) {
      throw new Error(`${file}: frontmatter "order" must be an integer.`);
    }
    return {
      slug,
      title: text(data, "title", file),
      summary: text(data, "summary", file),
      prerequisites: prerequisites as string[],
      series: seriesSlug,
      order: data.order,
      videoStart: data.video === undefined ? undefined : seconds(data.video, file),
    };
  });

  articles.sort((a, b) => a.series.localeCompare(b.series) || a.order - b.order);
  for (let i = 1; i < articles.length; i++) {
    const [a, b] = [articles[i - 1], articles[i]];
    if (a.series === b.series && a.order === b.order) {
      throw new Error(`Articles "${a.slug}" and "${b.slug}" have the same order (${a.order}) in Series "${a.series}".`);
    }
  }

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
    inSeries: (s) => articles.filter((a) => a.series === s),
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
