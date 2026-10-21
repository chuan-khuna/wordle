import { OpenersView } from "@/components/views/OpenersView";
import { pageText } from "@/lib/i18n/page-text";

export const metadata = { title: pageText("th").openerDistribution };

export default function ThaiOpenersPage() {
  return <OpenersView lang="th" />;
}
