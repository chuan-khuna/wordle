import Link from "next/link";
import { ArticleList } from "@/components/ArticleList";
import { content } from "@/lib/content";

export default function Home() {
  const { series, articles, inSeries } = content();
  return (
    <div className="max-w-3xl space-y-10">
      <h1 className="text-3xl font-bold text-heading">Solving Wordle</h1>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-heading">Series</h2>
        <ul className="space-y-3">
          {series.map((s) => (
            <li key={s.slug} className="rounded-md border border-highlight-med bg-surface p-4">
              <Link href={`/series/${s.slug}`} className="font-semibold text-heading hover:text-accent">
                {s.title}
              </Link>
              <p className="mt-1 text-sm text-subtle">
                {s.intro} ({inSeries(s.slug).length} Articles)
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-heading">All Articles</h2>
        <ArticleList articles={articles} />
      </section>
    </div>
  );
}
