import Link from "next/link";
import type { Article, Series } from "@/lib/content";

function Contents({ series, articles, current }: { series: Series; articles: Article[]; current: string }) {
  return (
    <>
      <Link href={`/series/${series.slug}`} className="block font-medium text-text hover:underline hover:decoration-accent hover:underline-offset-4">
        {series.title}
      </Link>
      <ol className="mt-3 space-y-0.5">
        {articles.map((a, i) => {
          const here = a.slug === current;
          return (
            <li key={a.slug}>
              <Link
                href={`/articles/${a.slug}`}
                aria-current={here ? "page" : undefined}
                className={`flex gap-2 border-l py-1 pl-3 text-sm ${
                  here
                    ? "border-text font-medium text-text"
                    : "border-rule text-meta hover:border-rule-strong hover:text-text"
                }`}
              >
                <span className="w-5 shrink-0 tabular-nums">{i + 1}.</span>
                <span>{a.title}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/**
 * The Series' Articles in order, with the current one marked. A sticky column on wide screens;
 * a collapsed disclosure above the Article at phone width (only one of the two is displayed).
 */
export function SeriesNav({ series, articles, current }: { series: Series; articles: Article[]; current: string }) {
  const label = `Articles in ${series.title}`;
  return (
    <>
      <nav
        aria-label={label}
        className="hidden font-sans lg:sticky lg:top-8 lg:block lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto"
      >
        <Contents series={series} articles={articles} current={current} />
      </nav>
      <details className="border-y border-rule py-3 font-sans lg:hidden">
        <summary className="eyebrow cursor-pointer">{label}</summary>
        <nav aria-label={label} className="mt-3">
          <Contents series={series} articles={articles} current={current} />
        </nav>
      </details>
    </>
  );
}
