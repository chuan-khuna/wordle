import Link from "next/link";
import type { Article, Series } from "@/lib/content";

function Contents({ series, articles, current }: { series: Series; articles: Article[]; current: string }) {
  return (
    <>
      <Link href={`/series/${series.slug}`} className="block font-semibold text-heading hover:text-accent">
        {series.title}
      </Link>
      <ol className="mt-2 space-y-1">
        {articles.map((a, i) => {
          const here = a.slug === current;
          return (
            <li key={a.slug}>
              <Link
                href={`/articles/${a.slug}`}
                aria-current={here ? "page" : undefined}
                className={`flex gap-2 rounded-md border-l-2 px-2 py-1 text-sm ${
                  here
                    ? "border-accent bg-highlight-low font-semibold text-heading"
                    : "border-transparent text-subtle hover:bg-highlight-low hover:text-text"
                }`}
              >
                <span className="w-5 shrink-0 text-right tabular-nums">{i + 1}.</span>
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
        className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto"
      >
        <Contents series={series} articles={articles} current={current} />
      </nav>
      <details className="rounded-md border border-highlight-med bg-surface p-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-heading">{label}</summary>
        <nav aria-label={label} className="mt-3">
          <Contents series={series} articles={articles} current={current} />
        </nav>
      </details>
    </>
  );
}
