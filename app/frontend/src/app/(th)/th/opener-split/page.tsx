import { OpenerSplitView } from "@/components/views/OpenerSplitView";
import { pageText } from "@/lib/i18n/page-text";

export const metadata = { title: pageText("th").openerSplit };

export default function ThaiOpenerSplitPage() {
  return <OpenerSplitView lang="th" />;
}
