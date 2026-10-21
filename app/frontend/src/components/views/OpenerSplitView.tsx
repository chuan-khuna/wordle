import { OpenerSplit } from "@/components/widgets/OpenerSplit";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";

/** The Opener Split page: the whole Answer List split by one Opener, as `SplitGroups`. */
export function OpenerSplitView({ lang = DEFAULT_LANGUAGE }: { lang?: Language }) {
  const text = pageText(lang);
  return (
    <div className="relative min-w-0 space-y-8">
      <header className="max-w-measure space-y-4">
        <p className="eyebrow">{text.explore}</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">{text.openerSplit}</h1>
        <p className="text-lg text-meta">{text.openerSplitIntro}</p>
        <p className="text-base text-meta">{text.openerSplitHelp}</p>
      </header>
      <OpenerSplit lang={lang} />
    </div>
  );
}
