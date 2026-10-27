"use client";

import { useEffect, useState } from "react";

export type Loaded<T> = { data: T | null; error: string | null; loading: boolean };

/** Fetch once per `key` (aborting on change or unmount). `load` gets an AbortSignal. */
export function useLoad<T>(key: string, load: (signal: AbortSignal) => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null } | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    load(ctl.signal).then(
      (data) => setState({ key, data, error: null }),
      (e: Error) => {
        if (e.name !== "AbortError") setState({ key, data: null, error: e.message });
      },
    );
    return () => ctl.abort();
    // `load` is determined by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = state?.key === key ? state : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: current === null };
}
