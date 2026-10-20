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
    <div className="relative max-w-measure space-y-12">
      <header className="space-y-4">
        <p className="eyebrow">Series</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">{series.title}</h1>
        <p className="text-lg text-meta">{series.intro}</p>
      </header>
      {series.video && <VideoEmbed video={series.video} title={`${series.title}: video`} />}
      <div className="prose prose-theme">
        <Body />
      </div>
      <section className="space-y-6">
        <h2 className="eyebrow">Articles</h2>
        <ol className="divide-y divide-rule border-y border-rule">
          {articles.map((a, i) => (
            <li key={a.slug} className="py-5">
              <Link href={`/articles/${a.slug}`} className="link text-lg font-medium tracking-tight">
                {i + 1}. {a.title}
              </Link>
              <p className="mt-1 text-meta">{a.summary}</p>
              {series.video && a.videoStart !== undefined && (
                <a href={youtubeUrl(series.video, a.videoStart)} className="link mt-2 inline-block font-sans text-sm">
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
