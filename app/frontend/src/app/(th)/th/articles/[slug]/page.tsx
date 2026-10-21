import { ArticleView } from "@/components/views/ArticleView";
import { content } from "@/lib/content/content";

export const dynamicParams = false;

/** Only Articles that have a Translation get a Thai page; links to the others go to the English page. */
export function generateStaticParams() {
  return content("th").articles.filter((a) => a.translated).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = content("th").articles.find((a) => a.slug === slug && a.translated);
  return article ? { title: article.title, description: article.summary } : {};
}

export default async function ThaiArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticleView slug={slug} lang="th" />;
}
