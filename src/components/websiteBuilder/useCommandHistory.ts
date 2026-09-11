"use client";

import { useCallback, useRef, useState } from "react";

// Command pattern: each user action is one object capturing only what it
// needs to apply forward or invert — e.g. a text edit captures old+new
// headline, not a clone of the whole page. This is what makes undo a
// "stack of inverse patches, not whole-page snapshots" per spec, and lets
// every kind of edit (text, reorder, add, delete, theme, a Free Layout
// block drag) push onto the exact same stack.
export type Command<T> = {
  apply: (state: T) => T;
  invert: (state: T) => T;
};

export function useCommandHistory<T>(initial: T) {
  const [state, setState] = useState(initial);
  const undoStack = useRef<Command<T>[]>([]);
  const redoStack = useRef<Command<T>[]>([]);
  // Stacks live in refs (mutated only from event handlers, never during
  // render), mirrored into this bit of state so canUndo/canRedo can be
  // read safely during render instead of touching the refs directly.
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });
  const syncCounts = () => setCounts({ undo: undoStack.current.length, redo: redoStack.current.length });

  const run = useCallback((command: Command<T>) => {
    setState((prev) => command.apply(prev));
    undoStack.current.push(command);
    redoStack.current = [];
    syncCounts();
  }, []);

  const undo = useCallback(() => {
    const command = undoStack.current.pop();
    if (!command) return;
    setState((prev) => command.invert(prev));
    redoStack.current.push(command);
    syncCounts();
  }, []);

  const redo = useCallback(() => {
    const command = redoStack.current.pop();
    if (!command) return;
    setState((prev) => command.apply(prev));
    undoStack.current.push(command);
    syncCounts();
  }, []);

  // Escape hatch for bursty input (dragging a color picker, typing in a
  // number field) that should feel instant but shouldn't push one undo
  // step per tick: the caller applies each intermediate tick via `setLive`
  // (updates what's displayed, no undo entry yet), then once the burst
  // settles pushes ONE command spanning old-before-the-burst to
  // new-after-the-burst via `pushCommand` — which registers the undo
  // entry without re-applying, since `setLive` calls already did that.
  const setLive = useCallback((updater: (prev: T) => T) => {
    setState(updater);
  }, []);

  const pushCommand = useCallback((command: Command<T>) => {
    undoStack.current.push(command);
    redoStack.current = [];
    syncCounts();
  }, []);

  // Used only for a hard reset (loading a different Saved Version) — not a
  // command, since restoring already has its own "snapshot the prior state
  // first" safety net server-side; the local undo/redo stack just starts
  // fresh from the newly-loaded state.
  const reset = useCallback((next: T) => {
    setState(next);
    undoStack.current = [];
    redoStack.current = [];
    syncCounts();
  }, []);

  return {
    state,
    run,
    setLive,
    pushCommand,
    undo,
    redo,
    reset,
    canUndo: counts.undo > 0,
    canRedo: counts.redo > 0,
  };
}
