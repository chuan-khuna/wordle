import Link from "next/link";
import { EnTag } from "@/components/EnTag";
import { VideoEmbed } from "@/components/VideoEmbed";
import { content, formatTimestamp, youtubeUrl } from "@/lib/content";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/language";
import { pageText } from "@/lib/page-text";
import { formatNumber } from "@/lib/parts";
import { articleLink } from "@/lib/paths";
import { componentsFor } from "@/mdx-components";

/** The Series page: title, intro, video, then each Part with its Articles. The home page of a language. */
export async function SeriesPage({ lang = DEFAULT_LANGUAGE }: { lang?: Language }) {
  const { series } = content(lang);
  const text = pageText(lang);
  const { default: Body } = lang === "th" ? await import("@content/th/series.mdx") : await import("@content/series.mdx");
  return (
    <div className="relative max-w-measure space-y-12">
      <header className="space-y-4">
        <p className="eyebrow">{text.series}</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">{series.title}</h1>
        <p className="text-lg text-meta">{series.intro}</p>
      </header>
      {series.video && <VideoEmbed video={series.video} title={`${series.title}: video`} />}
      <div className="prose prose-theme">
        <Body components={componentsFor(lang)} />
      </div>
      {series.parts.map((part) => (
        <section key={part.id} aria-labelledby={`part-${part.id}`} className="space-y-4">
          <header className="space-y-2">
            <p className="eyebrow">{text.part(part.number)}</p>
            <h2 id={`part-${part.id}`} className="text-2xl font-medium tracking-tight text-text">
              {part.title}
            </h2>
            <p className="text-meta">{part.intro}</p>
          </header>
          <ol className="divide-y divide-rule border-y border-rule">
            {part.articles.map((a) => (
              <li key={a.slug} className="py-5">
                <Link href={articleLink(a, lang)} className="link flex gap-3 text-lg font-medium tracking-tight">
                  <span className="shrink-0 font-mono text-base leading-7 tabular-nums">{formatNumber(a.number)}</span>
                  <span>
                    {a.title}
                    {!a.translated && <EnTag label={text.englishOnly}>{text.enTag}</EnTag>}
                  </span>
                </Link>
                <p className="mt-1 pl-8 text-meta">{a.summary}</p>
                {series.video && a.videoStart !== undefined && (
                  <a href={youtubeUrl(series.video, a.videoStart)} className="link mt-2 ml-8 inline-block font-sans text-sm">
                    {text.watchFrom(formatTimestamp(a.videoStart))}
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
