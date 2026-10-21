import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { content } from "@/lib/content";
import { latinFonts } from "@/lib/fonts";
import type { Language } from "@/lib/language";
import { pageText } from "@/lib/page-text";
import { themeScript } from "@/lib/theme-script";

/** The site's default title (the Series' title) and description in a language. */
export function siteMetadata(lang: Language): Metadata {
  const { title } = content(lang).series;
  return { title: { default: title, template: `%s | ${title}` }, description: pageText(lang).siteDescription };
}

/**
 * The whole document of a language: `<html lang>`, the theme script, the sidebar and `<main>`. Each language's root layout renders it
 * (the routes are two route groups with a root layout each, so `lang` is in the static HTML), passing the font classes it loads.
 */
export function SiteDocument({ lang, fonts = "", children }: { lang: Language; fonts?: string; children: React.ReactNode }) {
  const { series } = content(lang);
  // Which Articles have a Thai page, for the toggle: from the Thai content, never a list of slugs written here.
  const translatedSlugs = content("th").series.parts.flatMap((part) => part.articles.filter((a) => a.translated).map((a) => a.slug));
  return (
    <html lang={lang} suppressHydrationWarning className={`${latinFonts} ${fonts}`.trim()}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-serif text-text">
        <TooltipProvider>
        <div className="lg:grid lg:grid-cols-[var(--container-nav)_minmax(0,1fr)]">
          <Sidebar
            lang={lang}
            translatedSlugs={translatedSlugs}
            title={series.title}
            parts={series.parts.map(({ id, number, title, articles }) => ({
              id,
              number,
              title,
              articles: articles.map(({ slug, title, number, translated }) => ({ slug, title, number, translated })),
            }))}
          />
          <main className="mx-auto w-full min-w-0 max-w-page px-gutter py-12 sm:px-gutter-wide sm:py-16">{children}</main>
        </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
