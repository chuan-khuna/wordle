import { ArticleView } from "@/components/ArticleView";
import { content } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return content().articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = content().articles.find((a) => a.slug === slug);
  return article ? { title: article.title, description: article.summary } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticleView slug={slug} />;
}
