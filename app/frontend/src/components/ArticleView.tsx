import Link from "next/link";
import { notFound } from "next/navigation";
import { EnTag } from "@/components/EnTag";
import { content } from "@/lib/content";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/language";
import { pageText } from "@/lib/page-text";
import { formatNumber } from "@/lib/parts";
import { articleLink } from "@/lib/paths";
import { componentsFor } from "@/mdx-components";

const linkClass = "link";


/** An Article page in a language: header, body, backlinks, and previous / next. */
export async function ArticleView({ slug, lang = DEFAULT_LANGUAGE }: { slug: string; lang?: Language }) {
  const { articles, series, backlinks } = content(lang);
  const text = pageText(lang);
  const part = series.parts.find((p) => p.id === articles.find((a) => a.slug === slug)?.part);
  const article = articles.find((a) => a.slug === slug);
  if (!article || !article.translated) notFound();
  const { default: Body } =
    lang === DEFAULT_LANGUAGE
      ? await import(`@content/articles/${article.fileName}.mdx`)
      : await import(`@content/th/articles/${article.fileName}.mdx`);

  const at = articles.findIndex((a) => a.slug === slug);
  const prev = articles[at - 1];
  const next = articles[at + 1];
  const prerequisites = article.prerequisites.map((p) => articles.find((a) => a.slug === p)!);
  const builtOnBy = backlinks(slug);
  /** The "EN" tag after a link to an Article that has no Translation, so the reader knows it opens in English. */
  const tag = (a: { translated: boolean }) => !a.translated && <EnTag label={text.englishOnly}>{text.enTag}</EnTag>;

  return (
    <article className="article relative min-w-0 space-y-12">
        <header className="max-w-measure space-y-4">
          <p className="eyebrow">
            {text.part(part?.number ?? 0)} &middot; {part?.title} &middot;{" "}
            <span className="font-mono tabular-nums">{formatNumber(article.number)}</span>
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">{article.title}</h1>
          <p className="text-lg text-meta">{article.summary}</p>
          {prerequisites.length > 0 && (
            <p className="font-sans text-sm text-meta">
              {text.prerequisites}:{" "}
              {prerequisites.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 && ", "}
                  <Link href={articleLink(p, lang)} className={linkClass}>
                    {p.title}
                  </Link>
                  {tag(p)}
                </span>
              ))}
            </p>
          )}
        </header>

        <div className="prose prose-theme article-body [&>:is(p,ul,ol,h2,h3,h4,blockquote)]:max-w-measure">
          <Body components={componentsFor(lang)} />
        </div>

        {builtOnBy.length > 0 && (
          <section className="max-w-measure space-y-3">
            <h2 className="eyebrow">{text.buildsOnThis}</h2>
            <ul className="space-y-1">
              {builtOnBy.map((a) => (
                <li key={a.slug}>
                  <Link href={articleLink(a, lang)} className={linkClass}>
                    {a.title}
                  </Link>
                  {tag(a)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav
          aria-label={text.prevNext}
          className="flex max-w-measure justify-between gap-6 font-sans text-sm"
        >
          {prev ? (
            <Link href={articleLink(prev, lang)} rel="prev" className={linkClass}>
              &larr; <span className="font-mono tabular-nums">{formatNumber(prev.number)}</span> {prev.title}
              {tag(prev)}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={articleLink(next, lang)} rel="next" className={`${linkClass} text-right`}>
              <span className="font-mono tabular-nums">{formatNumber(next.number)}</span> {next.title}
              {tag(next)} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
    </article>
  );
}
