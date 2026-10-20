import Link from "next/link";
import { VideoEmbed } from "@/components/VideoEmbed";
import { content, formatTimestamp, youtubeUrl } from "@/lib/content";
import { formatNumber } from "@/lib/parts";

/** The home page is the Series page: title, intro, video, then each Part with its Articles. */
export default async function Home() {
  const { series } = content();
  const { default: Body } = await import("@content/series.mdx");
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
      {series.parts.map((part) => (
        <section key={part.id} aria-labelledby={`part-${part.id}`} className="space-y-4">
          <header className="space-y-2">
            <p className="eyebrow">Part {part.number}</p>
            <h2 id={`part-${part.id}`} className="text-2xl font-medium tracking-tight text-text">
              {part.title}
            </h2>
            <p className="text-meta">{part.intro}</p>
          </header>
          <ol className="divide-y divide-rule border-y border-rule">
            {part.articles.map((a) => (
              <li key={a.slug} className="py-5">
                <Link href={`/articles/${a.slug}`} className="link flex gap-3 text-lg font-medium tracking-tight">
                  <span className="shrink-0 font-mono text-base leading-7 tabular-nums">{formatNumber(a.number)}</span>
                  <span>{a.title}</span>
                </Link>
                <p className="mt-1 pl-8 text-meta">{a.summary}</p>
                {series.video && a.videoStart !== undefined && (
                  <a href={youtubeUrl(series.video, a.videoStart)} className="link mt-2 ml-8 inline-block font-sans text-sm">
                    Watch from {formatTimestamp(a.videoStart)}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
