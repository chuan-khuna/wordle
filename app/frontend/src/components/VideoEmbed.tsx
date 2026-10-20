import { youtubeEmbedUrl } from "@/lib/content";

/** A Series' video, starting at `start` seconds when given. */
export function VideoEmbed({ video, start, title }: { video: string; start?: number; title: string }) {
  return (
    <div className="aspect-video overflow-hidden rounded-lg border border-highlight-med bg-surface">
      <iframe
        src={youtubeEmbedUrl(video, start)}
        title={title}
        loading="lazy"
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
        className="size-full"
      />
    </div>
  );
}
