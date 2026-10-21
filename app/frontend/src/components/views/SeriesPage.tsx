import Link from "next/link";
import { EnTag } from "@/components/site/EnTag";
import { VideoEmbed } from "@/components/prose/VideoEmbed";
import { content, formatTimestamp, youtubeUrl } from "@/lib/content/content";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { formatNumber } from "@/lib/content/parts";
import { EXPLORE_PAGES } from "@/lib/explore";
import { articleLink } from "@/lib/i18n/paths";
import { componentsFor } from "@/mdx-components";

/** The Series page: title, intro, video, then each Part with its Articles. The home page of a language. */
export async function SeriesPage({ lang = DEFAULT_LANGUAGE }: { lang?: Language }) {
  const { series, articles } = content(lang);
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
      <section aria-labelledby="explore" className="space-y-4">
        <header className="space-y-2">
          <h2 id="explore" className="text-2xl font-medium tracking-tight text-text">
            {text.explore}
          </h2>
          <p className="text-meta">{text.exploreIntro}</p>
        </header>
        <ul className="divide-y divide-rule border-y border-rule">
          {EXPLORE_PAGES.map((page) => {
            const builtOn = page.articles.flatMap((slug) => articles.find((a) => a.slug === slug) ?? []);
            return (
              <li key={page.id} className="py-5">
                <Link href={page.path(lang)} className="link text-lg font-medium tracking-tight">
                  {text[page.name]}
                </Link>
                <p className="mt-1 text-meta">{text[page.purpose]}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-meta marker:text-rule-strong">
                  {page.points.map((key) => (
                    <li key={key}>{text[key]}</li>
                  ))}
                </ul>
                {builtOn.length > 0 && (
                  <p className="mt-2 font-sans text-sm text-meta">
                    {text.exploreBuildsOn}{" "}
                    {builtOn.map((a, i) => (
                      <span key={a.slug}>
                        {i > 0 && ", "}
                        <Link href={articleLink(a, lang)} className="link">
                          <span className="font-mono tabular-nums">{formatNumber(a.number)}</span> {a.title}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
