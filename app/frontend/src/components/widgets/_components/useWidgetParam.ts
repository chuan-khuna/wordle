"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/** The URL query param name for a Widget field: `name`, or `id.name` when the Widget has an `id`. */
export function paramName(id: string | undefined, name: string): string {
  return id ? `${id}.${name}` : name;
}

/** The URL param if present, else the MDX prop. Needs a <Suspense> boundary above it (useSearchParams). */
export function useParamInitial(id: string | undefined, name: string, prop: string): string {
  const searchParams = useSearchParams();
  const [initial] = useState(() => searchParams.get(paramName(id, name)) ?? prop);
  return initial;
}

/** Write `value` to the URL with history.replaceState, or remove the param when it equals the prop. */
export function useParamSync(id: string | undefined, name: string, value: string, prop: string): void {
  const key = paramName(id, name);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (value === prop) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [key, prop, value]);
}

/** Widget state that starts from the URL param (so a video take is reproducible), else the prop, and stays in the URL. */
export function useWidgetParam(id: string | undefined, name: string, prop: string): [string, (v: string) => void] {
  const [value, setValue] = useState(useParamInitial(id, name, prop));
  useParamSync(id, name, value, prop);
  return [value, setValue];
}
