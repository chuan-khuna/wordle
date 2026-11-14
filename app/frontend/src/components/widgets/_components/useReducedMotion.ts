"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Whether the reader asked for reduced motion (`prefers-reduced-motion: reduce`); false while rendering on the server. */
export const useReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
