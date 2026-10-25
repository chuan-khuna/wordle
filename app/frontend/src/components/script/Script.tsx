import { ExternalLink } from "lucide-react";

// The building blocks of the YouTube script (content/th/yt-script.mdx, the /yt-script page). They are not part of
// the Article components: only the script page passes them to its MDX body.

/** "4:10" or "1:02:05" to seconds. */
export function toSeconds(time: string): number {
  return time.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

/** Seconds to "m:ss". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Hidden in reading mode (the toggle in ScriptTimer sets data-script-read on <html>), so only the lines to say stay.
const stage = "[html[data-script-read]_&]:hidden";

/** One scene of the video: its planned start and end in the video, a title, then its Do, Open, Say and Demo blocks. */
export function Scene({ n, at, end, title, children }: { n: number; at: string; end: string; title: string; children: React.ReactNode }) {
  const start = toSeconds(at);
  const stop = toSeconds(end);
  return (
    <section id={`scene-${n}`} data-scene={n} data-start={start} data-end={stop} data-title={title} className="scroll-mt-28 space-y-6 border-t border-rule pt-10">
      <header className="max-w-measure space-y-2">
        <p className="eyebrow">
          ฉาก <span className="font-mono tabular-nums">{n}</span> &middot;{" "}
          <span className="font-mono tabular-nums">
            {at}–{end}
          </span>{" "}
          &middot; ประมาณ <span className="font-mono tabular-nums">{formatTime(stop - start)}</span> นาที
        </p>
        <h2 className="!m-0 text-2xl font-medium text-text">{title}</h2>
      </header>
      {children}
    </section>
  );
}

/** The words to say, set large like a teleprompter. */
export function Say({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-measure border-l-2 border-accent pl-5 text-xl leading-relaxed [&>p]:my-4">
      <p className="eyebrow !my-0">พูด</p>
      {children}
    </div>
  );
}

/** What happens on screen: clicks, typing, cuts. Hidden in reading mode. */
export function Do({ children }: { children: React.ReactNode }) {
  return (
    <aside className={`${stage} max-w-measure rounded-md border border-rule bg-highlight-low px-4 py-3 font-sans text-sm [&_li]:my-1 [&_ol]:my-1 [&_p]:my-1 [&_ul]:my-1`}>
      <p className="eyebrow !mt-0">บนจอ</p>
      {children}
    </aside>
  );
}

/** A page to open while recording, in a new tab so the script stays open. Hidden in reading mode. */
export function Open({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p className={`${stage} not-prose max-w-measure font-sans text-sm`}>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="group inline-flex max-w-full items-baseline gap-2 rounded-sm border border-rule-strong px-3 py-1.5 text-text no-underline hover:bg-highlight-low"
      >
        <ExternalLink aria-hidden className="size-3.5 shrink-0 self-center text-meta" />
        <span className="font-medium">{children}</span>
        <code className="min-w-0 truncate font-mono text-xs text-meta">{href}</code>
      </a>
    </p>
  );
}

/** A live Widget to rehearse with (the same Widget, in the same state, as the page that Open links to). Hidden in reading mode. */
export function Demo({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${stage} space-y-2`}>
      <p className="eyebrow">เดโม: ลองเล่นก่อนอัด</p>
      {children}
    </div>
  );
}
