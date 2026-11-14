import { FeedbackMatrix } from "@/components/widgets/FeedbackMatrix";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";

/** The Feedback Matrix page: the Answer × Answer Feedback Matrix as one picture. `answers` is the build-time Answer List (sorted), the axes' words. */
export function MatrixView({ answers, lang = DEFAULT_LANGUAGE }: { answers: readonly string[]; lang?: Language }) {
  const text = pageText(lang);
  return (
    <div className="relative min-w-0 space-y-8">
      <header className="max-w-measure space-y-4">
        <p className="eyebrow">{text.explore}</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">{text.matrix}</h1>
        <p className="text-lg text-meta">{text.matrixIntro}</p>
        <p className="text-base text-meta">{text.matrixHelp}</p>
      </header>
      <FeedbackMatrix answers={answers} lang={lang} />
    </div>
  );
}
