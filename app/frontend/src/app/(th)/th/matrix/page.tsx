import { MatrixView } from "@/components/views/MatrixView";
import { pageText } from "@/lib/i18n/page-text";
import { answerList } from "@/lib/wordle/words";

export const metadata = { title: pageText("th").matrix };

export default function ThaiMatrixPage() {
  return <MatrixView lang="th" answers={answerList()} />;
}
