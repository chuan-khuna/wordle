import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoEmbed } from "@/components/VideoEmbed";
import { content, formatTimestamp, youtubeUrl } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return content().series.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const series = content().series.find((s) => s.slug === slug);
  return series ? { title: series.title, description: series.intro } : {};
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { series: all, inSeries } = content();
  const series = all.find((s) => s.slug === slug);
  if (!series) notFound();
  const { default: Body } = await import(`@content/series/${slug}.mdx`);
  const articles = inSeries(slug);
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-heading">{series.title}</h1>
        <p className="text-subtle">{series.intro}</p>
      </header>
      {series.video && <VideoEmbed video={series.video} title={`${series.title}: video`} />}
      <div className="prose prose-theme">
        <Body />
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-heading">Articles</h2>
        <ol className="space-y-3">
          {articles.map((a, i) => (
            <li key={a.slug} className="rounded-md border border-highlight-med bg-surface p-4">
              <Link href={`/articles/${a.slug}`} className="font-semibold text-heading hover:text-accent">
                {i + 1}. {a.title}
              </Link>
              <p className="mt-1 text-sm text-subtle">{a.summary}</p>
              {series.video && a.videoStart !== undefined && (
                <a href={youtubeUrl(series.video, a.videoStart)} className="mt-1 inline-block text-sm text-accent hover:underline">
                  Watch from {formatTimestamp(a.videoStart)}
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
