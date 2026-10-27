import Link from "next/link";
import { OpenerDistribution } from "@/components/widgets/OpenerDistribution";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { content } from "@/lib/content/content";
import { articleLink } from "@/lib/i18n/paths";

/** The Opener Distribution page: the Widget at full width, with every control. */
export function OpenersView({ lang = DEFAULT_LANGUAGE }: { lang?: Language }) {
  const text = pageText(lang);
  const article = content(lang).articles.find((a) => a.slug === "opener-distribution");
  return (
    <div className="relative min-w-0 space-y-8">
      <header className="max-w-measure space-y-4">
        <p className="eyebrow">{text.explore}</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">{text.openerDistribution}</h1>
        <p className="text-lg text-meta">{text.openersIntro}</p>
        <p className="text-base text-meta">
          {text.openersHelp}{" "}
          {article && <Link href={articleLink(article, lang)} className="underline">{text.howItWorks}</Link>}
          {text.sentenceEnd}
        </p>
      </header>
      <OpenerDistribution tabs hideTitle />
    </div>
  );
}
