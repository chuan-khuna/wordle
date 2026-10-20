import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoEmbed } from "@/components/VideoEmbed";
import { content, formatTimestamp, youtubeUrl } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return content().articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = content().articles.find((a) => a.slug === slug);
  return article ? { title: article.title, description: article.summary } : {};
}

const linkClass = "text-accent hover:underline";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { articles, series: allSeries, backlinks, inSeries } = content();
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  const { default: Body } = await import(`@content/articles/${slug}.mdx`);

  const series = allSeries.find((s) => s.slug === article.series)!;
  const siblings = inSeries(series.slug);
  const at = siblings.findIndex((a) => a.slug === slug);
  const prev = siblings[at - 1];
  const next = siblings[at + 1];
  const prerequisites = article.prerequisites.map((p) => articles.find((a) => a.slug === p)!);
  const builtOnBy = backlinks(slug);

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-subtle">
          <Link href={`/series/${series.slug}`} className={linkClass}>
            {series.title}
          </Link>{" "}
          &middot; Article {at + 1} of {siblings.length}
        </p>
        <h1 className="text-3xl font-bold text-heading">{article.title}</h1>
        <p className="text-subtle">{article.summary}</p>
        {prerequisites.length > 0 && (
          <p className="text-sm text-subtle">
            Prerequisites:{" "}
            {prerequisites.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && ", "}
                <Link href={`/articles/${p.slug}`} className={linkClass}>
                  {p.title}
                </Link>
              </span>
            ))}
          </p>
        )}
      </header>

      <div className="prose prose-theme">
        <Body />
      </div>

      {series.video && article.videoStart !== undefined && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-heading">In the video</h2>
          <p className="text-sm text-subtle">
            This Article starts at {formatTimestamp(article.videoStart)} of the Series video.{" "}
            <a href={youtubeUrl(series.video, article.videoStart)} className={linkClass}>
              Open it on YouTube
            </a>
            .
          </p>
          <VideoEmbed video={series.video} start={article.videoStart} title={`${series.title}: ${article.title}`} />
        </section>
      )}

      {builtOnBy.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-heading">Builds on this Article</h2>
          <ul className="list-disc space-y-1 pl-6">
            {builtOnBy.map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className={linkClass}>
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Series" className="flex justify-between gap-4 border-t border-highlight-med pt-4 text-sm">
        {prev ? (
          <Link href={`/articles/${prev.slug}`} rel="prev" className={linkClass}>
            &larr; {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/articles/${next.slug}`} rel="next" className={`${linkClass} text-right`}>
            {next.title} &rarr;
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
