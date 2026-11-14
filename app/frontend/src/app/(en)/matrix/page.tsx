import { MatrixView } from "@/components/views/MatrixView";
import { answerList } from "@/lib/wordle/words";

export const metadata = { title: "Feedback Matrix" };

export default function MatrixPage() {
  return <MatrixView answers={answerList()} />;
}
