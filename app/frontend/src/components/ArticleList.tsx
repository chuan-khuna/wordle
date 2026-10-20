import Link from "next/link";
import type { Article } from "@/lib/content";

export function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {articles.map((a) => (
        <li key={a.slug} className="py-5">
          <Link href={`/articles/${a.slug}`} className="link text-lg font-medium tracking-tight">
            {a.title}
          </Link>
          <p className="mt-1 text-meta">{a.summary}</p>
        </li>
      ))}
    </ol>
  );
}
