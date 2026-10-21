import { FollowView } from "@/components/views/FollowView";
import { pageText } from "@/lib/i18n/page-text";

export const metadata = { title: pageText("th").follow };

export default function ThaiFollowPage() {
  return <FollowView lang="th" />;
}
