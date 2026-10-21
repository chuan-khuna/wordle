import { OpenersView } from "@/components/OpenersView";
import { pageText } from "@/lib/page-text";

export const metadata = { title: pageText("th").openerDistribution };

export default function ThaiOpenersPage() {
  return <OpenersView lang="th" />;
}
