"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { EnTag } from "@/components/site/EnTag";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { ThemePicker } from "@/components/site/ThemePicker";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { formatNumber } from "@/lib/content/parts";
import { articleLink, followPath, homePath, openerSplitPath, openersPath } from "@/lib/i18n/paths";

type Item = { slug: string; title: string; number: number; translated: boolean };
type Group = { id: string; number: number; title: string; articles: Item[] };

/**
 * The site-wide sidebar: the site title (home) at the top with the language toggle and the theme menu (a palette icon) beside it, then the Articles
 * grouped under their Part titles, then an Explore heading linking to the Opener Distribution, Opener Split and Follow an Answer pages. A sticky full-height column from `lg`; below that a compact top bar whose button opens
 * the menu, beside the theme menu button. One markup, so CSS only decides what is shown.
 */
export function Sidebar({ title, parts, lang = DEFAULT_LANGUAGE, translatedSlugs = [] }: { title: string; parts: Group[]; lang?: Language; translatedSlugs?: string[] }) {
  const pathname = usePathname();
  const text = pageText(lang);
  // The page the phone menu was opened on, so it closes by itself after navigating.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <aside className="border-b border-rule bg-background font-sans lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0">
      <Collapsible open={open} onOpenChange={(next) => setOpenOn(next ? pathname : null)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-x-4 gap-y-3 px-gutter py-3 lg:flex-wrap lg:pt-8 lg:pb-4">
          <Link href={homePath(lang)} className="lg:basis-full text-base font-medium tracking-tight text-text hover:underline hover:decoration-accent hover:underline-offset-4">
            {title}
          </Link>
          <div className="flex items-center gap-1 max-lg:ml-auto lg:w-full lg:justify-between">
            <LanguageToggle lang={lang} translatedSlugs={translatedSlugs} />
            <ThemePicker align="end" />
            <CollapsibleTrigger asChild className="lg:hidden">
              <Button>{open ? text.close : text.menu}</Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent forceMount id="site-menu" className="min-h-0 flex-1 flex-col data-[state=closed]:hidden data-[state=open]:flex lg:data-[state=closed]:flex">
        <nav aria-label={text.siteNav} className="min-h-0 flex-1 overflow-y-auto px-gutter pb-4 max-lg:max-h-[60vh]">
          {parts.map((part) => (
            <section key={part.id} aria-labelledby={`nav-part-${part.id}`} className="mb-5 last:mb-0">
              <h2 id={`nav-part-${part.id}`} className="eyebrow mb-2">
                {text.part(part.number)} &middot; {part.title}
              </h2>
              <ol className="space-y-0.5">
                {part.articles.map((a) => {
                  const href = articleLink(a, lang);
                  const here = pathname === href;
                  return (
                    <li key={a.slug}>
                      <Link
                        href={href}
                        aria-current={here ? "page" : undefined}
                        className={`flex gap-2 border-l py-1 pl-3 text-sm ${
                          here ? "border-text font-medium text-text" : "border-rule text-meta hover:border-rule-strong hover:text-text"
                        }`}
                      >
                        <span className="w-6 shrink-0 font-mono text-xs leading-5 tabular-nums">{formatNumber(a.number)}</span>
                        <span>
                          {a.title}
                          {!a.translated && <EnTag label={text.englishOnly}>{text.enTag}</EnTag>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <section aria-labelledby="nav-explore" className="mt-5">
            <h2 id="nav-explore" className="eyebrow mb-2">
              {text.explore}
            </h2>
            {[
              { href: openersPath(lang), label: text.openerDistribution },
              { href: openerSplitPath(lang), label: text.openerSplit },
              { href: followPath(lang), label: text.follow },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`block border-l py-1 pl-3 text-sm ${
                  pathname === href ? "border-text font-medium text-text" : "border-rule text-meta hover:border-rule-strong hover:text-text"
                }`}
              >
                {label}
              </Link>
            ))}
          </section>
        </nav>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}
