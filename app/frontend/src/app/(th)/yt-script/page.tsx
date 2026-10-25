import type { Metadata } from "next";
import Script from "@content/th/yt-script.mdx";
import { Demo, Do, Open, Say, Scene } from "@/components/script/Script";
import { ScriptTimer } from "@/components/script/ScriptTimer";
import { componentsFor } from "@/mdx-components";

// The Thai YouTube script for the Series video: a working page for recording, so it is in no menu and not indexed.
// It lives in the Thai route group for `<html lang="th">` and the Thai font, at /yt-script.
export const metadata: Metadata = { title: "สคริปต์ YouTube", robots: { index: false, follow: false } };

const components = { ...componentsFor("th"), Scene, Say, Do, Open, Demo };

export default function YouTubeScriptPage() {
  return (
    <div className="relative min-w-0 space-y-8">
      <ScriptTimer />
      <div className="prose prose-theme article-body space-y-8 [&>:is(p,ul,ol,h2,h3,h4,blockquote)]:max-w-measure">
        <Script components={components} />
      </div>
    </div>
  );
}
