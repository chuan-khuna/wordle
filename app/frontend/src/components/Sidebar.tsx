"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemePicker } from "@/components/ThemePicker";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatNumber } from "@/lib/parts";

type Item = { slug: string; title: string; number: number };
type Group = { id: string; number: number; title: string; articles: Item[] };

/**
 * The site-wide sidebar: the site title (home) at the top with the theme menu (a palette icon) beside it, then the Articles
 * grouped under their Part titles, then an Explore heading linking to the Opener Distribution page. A sticky full-height column from `lg`; below that a compact top bar whose button opens
 * the menu, beside the theme menu button. One markup, so CSS only decides what is shown.
 */
export function Sidebar({ title, parts }: { title: string; parts: Group[] }) {
  const pathname = usePathname();
  // The page the phone menu was opened on, so it closes by itself after navigating.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <aside className="border-b border-rule bg-background font-sans lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0">
      <Collapsible open={open} onOpenChange={(next) => setOpenOn(next ? pathname : null)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 px-gutter py-3 lg:pt-8 lg:pb-4">
          <Link href="/" className="text-base font-medium tracking-tight text-text hover:underline hover:decoration-accent hover:underline-offset-4">
            {title}
          </Link>
          <div className="flex items-center gap-1">
            <ThemePicker align="end" />
            <CollapsibleTrigger asChild className="lg:hidden">
              <Button>{open ? "Close" : "Menu"}</Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent forceMount id="site-menu" className="min-h-0 flex-1 flex-col data-[state=closed]:hidden data-[state=open]:flex lg:data-[state=closed]:flex">
        <nav aria-label="Site" className="min-h-0 flex-1 overflow-y-auto px-gutter pb-4 max-lg:max-h-[60vh]">
          {parts.map((part) => (
            <section key={part.id} aria-labelledby={`nav-part-${part.id}`} className="mb-5 last:mb-0">
              <h2 id={`nav-part-${part.id}`} className="eyebrow mb-2">
                Part {part.number} &middot; {part.title}
              </h2>
              <ol className="space-y-0.5">
                {part.articles.map((a) => {
                  const here = pathname === `/articles/${a.slug}`;
                  return (
                    <li key={a.slug}>
                      <Link
                        href={`/articles/${a.slug}`}
                        aria-current={here ? "page" : undefined}
                        className={`flex gap-2 border-l py-1 pl-3 text-sm ${
                          here ? "border-text font-medium text-text" : "border-rule text-meta hover:border-rule-strong hover:text-text"
                        }`}
                      >
                        <span className="w-6 shrink-0 font-mono text-xs leading-5 tabular-nums">{formatNumber(a.number)}</span>
                        <span>{a.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <section aria-labelledby="nav-explore" className="mt-5">
            <h2 id="nav-explore" className="eyebrow mb-2">
              Explore
            </h2>
            <Link
              href="/openers"
              aria-current={pathname === "/openers" ? "page" : undefined}
              className={`block border-l py-1 pl-3 text-sm ${
                pathname === "/openers" ? "border-text font-medium text-text" : "border-rule text-meta hover:border-rule-strong hover:text-text"
              }`}
            >
              Opener Distribution
            </Link>
          </section>
        </nav>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}
