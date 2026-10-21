import { Follow } from "@/components/widgets/Follow";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";

/** The Follow an Answer page: the Solver's Game for one Answer, one row of `SplitGroups` at a time. */
export function FollowView({ lang = DEFAULT_LANGUAGE }: { lang?: Language }) {
  const text = pageText(lang);
  return (
    <div className="relative min-w-0 space-y-8">
      <header className="max-w-measure space-y-4">
        <p className="eyebrow">{text.explore}</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">{text.follow}</h1>
        <p className="text-lg text-meta">{text.followIntro}</p>
        <p className="text-base text-meta">{text.followHelp}</p>
      </header>
      <Follow lang={lang} />
    </div>
  );
}
