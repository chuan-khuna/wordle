"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/components/script/Script";

type SceneInfo = { n: number; start: number; end: number; title: string; el: HTMLElement };

/** How far below the top of the window a scene must start to count as the one being read. */
const READ_LINE = 160;

/**
 * The script page's sticky bar: a stopwatch for the take, the scene being read (the last one whose top has passed
 * READ_LINE) with how far the take is ahead of or behind its planned start, a scene menu, and reading mode.
 */
export function ScriptTimer() {
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [current, setCurrent] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [banked, setBanked] = useState(0);
  const [now, setNow] = useState(0);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    const found = [...document.querySelectorAll<HTMLElement>("[data-scene]")].map((el) => ({
      n: Number(el.dataset.scene),
      start: Number(el.dataset.start),
      end: Number(el.dataset.end),
      title: el.dataset.title ?? "",
      el,
    }));
    const onScroll = () => {
      let at = 0;
      found.forEach((s, i) => {
        if (s.el.getBoundingClientRect().top <= READ_LINE) at = i;
      });
      setCurrent(at);
    };
    // The scenes are only in the DOM, so they are read after the first paint.
    const frame = requestAnimationFrame(() => {
      setScenes(found);
      onScroll();
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    const root = document.documentElement;
    if (reading) root.dataset.scriptRead = "";
    else delete root.dataset.scriptRead;
    return () => {
      delete root.dataset.scriptRead;
    };
  }, [reading]);

  const elapsed = banked + (startedAt === null ? 0 : Math.max(0, now - startedAt) / 1000);
  const running = startedAt !== null;
  const scene = scenes[current];
  const delta = scene ? elapsed - scene.start : 0;
  const total = scenes.length > 0 ? scenes[scenes.length - 1].end : 0;

  const toggle = () => {
    if (running) {
      setBanked(elapsed);
      setStartedAt(null);
    } else {
      setNow(Date.now());
      setStartedAt(Date.now());
    }
  };
  const reset = () => {
    setStartedAt(null);
    setBanked(0);
  };

  return (
    <div className="sticky top-0 z-20 -mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-background/95 px-2 py-3 font-sans text-sm backdrop-blur">
      <div className="flex items-center gap-1.5">
        <Button size="icon-sm" onClick={toggle} aria-label={running ? "หยุดจับเวลา" : "เริ่มจับเวลา"}>
          {running ? <Pause /> : <Play />}
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={reset} aria-label="รีเซ็ตเวลา">
          <RotateCcw />
        </Button>
        <span className="font-mono text-lg tabular-nums text-text" aria-live="off">
          {formatTime(elapsed)}
        </span>
        <span className="font-mono text-xs text-meta tabular-nums">/ {formatTime(total)}</span>
      </div>

      {scene && (
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-meta">ฉาก {scene.n}</span>
          <span className="truncate text-text">{scene.title}</span>
          <span className="font-mono text-xs text-meta tabular-nums">เริ่ม {formatTime(scene.start)}</span>
          {(running || elapsed > 0) && (
            <span className={`font-mono text-xs tabular-nums ${Math.abs(delta) < 30 ? "text-meta" : "text-error"}`}>
              {delta >= 0 ? `ช้า +${formatTime(delta)}` : `เร็ว −${formatTime(-delta)}`}
            </span>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="text-meta">ไปที่</span>
          <select
            className="h-8 max-w-48 rounded-sm border border-rule-strong bg-background px-2 text-text"
            value={scene?.n ?? ""}
            onChange={(e) => document.getElementById(`scene-${e.target.value}`)?.scrollIntoView({ behavior: "smooth" })}
          >
            {scenes.map((s) => (
              <option key={s.n} value={s.n}>
                {formatTime(s.start)} · {s.title}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant={reading ? "secondary" : "default"} aria-pressed={reading} onClick={() => setReading(!reading)}>
          โหมดอ่านบท
        </Button>
      </div>
    </div>
  );
}
