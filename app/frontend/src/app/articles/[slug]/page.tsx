import Link from "next/link";
import { notFound } from "next/navigation";
import { content } from "@/lib/content";
import { formatNumber } from "@/lib/parts";

export const dynamicParams = false;

export function generateStaticParams() {
  return content().articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = content().articles.find((a) => a.slug === slug);
  return article ? { title: article.title, description: article.summary } : {};
}

const linkClass = "link";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { articles, series, backlinks } = content();
  const part = series.parts.find((p) => p.id === articles.find((a) => a.slug === slug)?.part);
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  const { default: Body } = await import(`@content/articles/${article.fileName}.mdx`);

  const at = articles.findIndex((a) => a.slug === slug);
  const prev = articles[at - 1];
  const next = articles[at + 1];
  const prerequisites = article.prerequisites.map((p) => articles.find((a) => a.slug === p)!);
  const builtOnBy = backlinks(slug);

  return (
    <article className="relative min-w-0 space-y-12">
        <header className="max-w-measure space-y-4">
          <p className="eyebrow">
            Part {part?.number} &middot; {part?.title} &middot;{" "}
            <span className="font-mono tabular-nums">{formatNumber(article.number)}</span>
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">{article.title}</h1>
          <p className="text-lg text-meta">{article.summary}</p>
          {prerequisites.length > 0 && (
            <p className="font-sans text-sm text-meta">
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

        <div className="prose prose-theme [&>:is(p,ul,ol,h2,h3,h4,blockquote)]:max-w-measure">
          <Body />
        </div>

        {builtOnBy.length > 0 && (
          <section className="space-y-3">
            <h2 className="eyebrow">Builds on this Article</h2>
            <ul className="space-y-1">
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

        <nav
          aria-label="Previous and next Article"
          className="flex justify-between gap-6 font-sans text-sm"
        >
          {prev ? (
            <Link href={`/articles/${prev.slug}`} rel="prev" className={linkClass}>
              &larr; <span className="font-mono tabular-nums">{formatNumber(prev.number)}</span> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/articles/${next.slug}`} rel="next" className={`${linkClass} text-right`}>
              <span className="font-mono tabular-nums">{formatNumber(next.number)}</span> {next.title} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
    </article>
  );
}
