import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnTag } from "@/components/site/EnTag";
import { TableOfContents } from "@/components/site/TableOfContents";
import { content } from "@/lib/content/content";
import { articleToc } from "@/lib/content/toc";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { formatNumber } from "@/lib/content/parts";
import { articleLink } from "@/lib/i18n/paths";
import { componentsFor } from "@/mdx-components";

const linkClass = "link";

// A previous / next card in the footer: a hairline box that firms up on hover and focus, an arrow on its outer side.
const pagerCard =
  "group flex items-center gap-3 rounded-md border border-rule px-4 py-3 shadow-xs transition-colors hover:border-rule-strong hover:bg-highlight-low focus-visible:border-rule-strong";

/**
 * An Article page in a language: header, body, and a footer below a hairline (the related Articles, then previous / next
 * cards), with its Table of contents to the left on wide windows.
 */
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
  // Related Articles: the Prerequisites, then the Articles that build on this one, each once.
  const related = [
    ...prerequisites.map((a) => ({ article: a, relation: text.relationPrerequisite })),
    ...backlinks(slug)
      .filter((a) => !article.prerequisites.includes(a.slug))
      .map((a) => ({ article: a, relation: text.relationBuildsOn })),
  ];
  const toc = articleToc(article.fileName, lang);
  /** The "EN" tag after a link to an Article that has no Translation, so the reader knows it opens in English. */
  const tag = (a: { translated: boolean }) => !a.translated && <EnTag label={text.englishOnly}>{text.enTag}</EnTag>;

  return (
    <div className={toc.length > 0 ? "article-with-toc" : undefined}>
    {toc.length > 0 && <TableOfContents entries={toc} label={text.onThisPage} />}
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

        <footer className="max-w-measure space-y-8 border-t border-rule pt-8 font-sans">
          {related.length > 0 && (
            <section aria-labelledby="related-articles" className="space-y-3">
              <h2 id="related-articles" className="eyebrow">
                {text.relatedArticles}
              </h2>
              <ul className="space-y-2">
                {related.map(({ article: a, relation }) => (
                  <li key={a.slug} className="flex items-baseline gap-3">
                    <span className="shrink-0 font-mono text-sm text-meta tabular-nums">{formatNumber(a.number)}</span>
                    <span className="min-w-0">
                      <Link href={articleLink(a, lang)} className={linkClass}>
                        {a.title}
                      </Link>
                      {tag(a)}
                      <span className="ml-2 text-xs text-meta">{relation}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <nav aria-label={text.prevNext} className="grid gap-4 sm:grid-cols-2">
            {prev && (
              <Link href={articleLink(prev, lang)} rel="prev" className={pagerCard}>
                <ArrowLeft aria-hidden className="size-5 shrink-0 text-meta transition-transform group-hover:-translate-x-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm text-meta">{text.previousArticle}</span>
                  <span className="block text-lg leading-snug text-balance text-text">
                    {prev.title}
                    {tag(prev)}
                  </span>
                </span>
              </Link>
            )}
            {next && (
              <Link href={articleLink(next, lang)} rel="next" className={`${pagerCard} justify-end text-right sm:col-start-2`}>
                <span className="min-w-0">
                  <span className="block text-sm text-meta">{text.nextArticle}</span>
                  <span className="block text-lg leading-snug text-balance text-text">
                    {next.title}
                    {tag(next)}
                  </span>
                </span>
                <ArrowRight aria-hidden className="size-5 shrink-0 text-meta transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </nav>
        </footer>
    </article>
    </div>
  );
}
