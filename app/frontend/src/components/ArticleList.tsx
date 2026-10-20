import Link from "next/link";
import type { Article } from "@/lib/content";

export function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <ol className="space-y-3">
      {articles.map((a) => (
        <li key={a.slug} className="rounded-md border border-highlight-med bg-surface p-4">
          <Link href={`/articles/${a.slug}`} className="font-semibold text-heading hover:text-accent">
            {a.title}
          </Link>
          <p className="mt-1 text-sm text-subtle">{a.summary}</p>
        </li>
      ))}
    </ol>
  );
}
