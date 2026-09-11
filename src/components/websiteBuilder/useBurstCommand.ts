"use client";

import { useRef } from "react";

// Coalesces a rapid sequence of live edits (dragging a native color
// picker, typing digits into a size field, a Free Layout block being
// resized several times in quick succession) into ONE undo command
// spanning the value from before the burst to wherever it settles —
// pairs with useCommandHistory's setLive/pushCommand split: the caller
// applies every intermediate tick via setLive (instant visual feedback,
// no undo entry yet), and `report` here waits for a quiet moment before
// asking the caller to push the single resulting command.
export function useBurstCommand<T>(delayMs = 600) {
  const startRef = useRef<T | null>(null);
  const latestRef = useRef<T | null>(null);
  const timerRef = useRef<number | null>(null);

  function report(before: T, after: T, commit: (before: T, after: T) => void) {
    if (startRef.current === null) startRef.current = before;
    latestRef.current = after;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => flush(commit), delayMs);
  }

  function flush(commit: (before: T, after: T) => void) {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (startRef.current !== null && latestRef.current !== null) {
      commit(startRef.current, latestRef.current);
    }
    startRef.current = null;
    latestRef.current = null;
  }

  return { report, flush };
}
