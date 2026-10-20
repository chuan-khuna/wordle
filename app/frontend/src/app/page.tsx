import Link from "next/link";
import { ArticleList } from "@/components/ArticleList";
import { content } from "@/lib/content";

export default function Home() {
  const { series, articles, inSeries } = content();
  return (
    <div className="max-w-measure space-y-section">
      <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">Solving Wordle</h1>
      <section className="space-y-6">
        <h2 className="eyebrow">Series</h2>
        <ul className="divide-y divide-rule border-y border-rule">
          {series.map((s) => (
            <li key={s.slug} className="py-6">
              <Link href={`/series/${s.slug}`} className="link text-xl font-medium tracking-tight">
                {s.title}
              </Link>
              <p className="mt-2 text-text">{s.intro}</p>
              <p className="eyebrow mt-3">{inSeries(s.slug).length} Articles</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-6">
        <h2 className="eyebrow">All Articles</h2>
        <ArticleList articles={articles} />
      </section>
    </div>
  );
}
