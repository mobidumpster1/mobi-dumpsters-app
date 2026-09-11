"use client";

import { useEffect, useRef, useState } from "react";

// Pointer-events-based drag reorder — no new dependency, matching this
// repo's existing precedent that react-rnd's custom drag math already
// proves is tractable here. Mouse arms a drag past a small movement
// threshold; touch requires a short hold first (so a normal scroll still
// works), matching the "long-press to start a drag on touch" requirement.
//
// Returns the same reorderSections index math the toolbar's ↑/↓ buttons
// use, via the `onReorder(fromIndex, toIndex)` callback — see
// SectionEditor.tsx, which passes the exact same command constructor to
// both paths so they can never disagree about the resulting order.
const MOVE_THRESHOLD_PX = 6;
const TOUCH_LONG_PRESS_MS = 400;
const TOUCH_CANCEL_TOLERANCE_PX = 10;

export function useSectionDragReorder(orderedIds: string[], onReorder: (fromIndex: number, toIndex: number) => void) {
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Kept fresh after every render (via effect, not during render itself)
  // without changing identity, so the window listeners below (attached
  // once) always see current values.
  const orderedIdsRef = useRef(orderedIds);
  const onReorderRef = useRef(onReorder);
  useEffect(() => {
    orderedIdsRef.current = orderedIds;
    onReorderRef.current = onReorder;
  });

  const pendingRef = useRef<{ id: string; x: number; y: number; touch: boolean } | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const setItemRef = (id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

  function computeDropIndex(clientY: number, excludeId: string): number {
    const others = orderedIdsRef.current.filter((id) => id !== excludeId);
    for (let i = 0; i < others.length; i++) {
      const rect = itemRefs.current.get(others[i])?.getBoundingClientRect();
      if (!rect) continue;
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return others.length;
  }

  // Stable function identities (created once) so addEventListener /
  // removeEventListener always target the same reference.
  const handleWindowMove = useRef((e: PointerEvent) => {
    if (draggingIdRef.current) {
      const next = computeDropIndex(e.clientY, draggingIdRef.current);
      dropIndexRef.current = next;
      setDropIndex(next);
      return;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    const moved = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
    if (pending.touch) {
      if (moved > TOUCH_CANCEL_TOLERANCE_PX && longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        teardown();
      }
    } else if (moved > MOVE_THRESHOLD_PX) {
      arm(pending.id);
    }
  }).current;

  const handleWindowUp = useRef(() => {
    const id = draggingIdRef.current;
    if (id) {
      const fromIndex = orderedIdsRef.current.indexOf(id);
      const toIndex = dropIndexRef.current ?? fromIndex;
      if (fromIndex !== -1 && toIndex !== fromIndex) onReorderRef.current(fromIndex, toIndex);
    }
    draggingIdRef.current = null;
    dropIndexRef.current = null;
    setDraggingId(null);
    setDropIndex(null);
    teardown();
  }).current;

  function arm(id: string) {
    draggingIdRef.current = id;
    dropIndexRef.current = orderedIdsRef.current.indexOf(id);
    setDraggingId(id);
    setDropIndex(dropIndexRef.current);
  }

  function teardown() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pendingRef.current = null;
    window.removeEventListener("pointermove", handleWindowMove);
    window.removeEventListener("pointerup", handleWindowUp);
  }

  useEffect(() => teardown, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onPointerDown(e: React.PointerEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest('[contenteditable="true"], button, a, input, textarea, select')) return;
    pendingRef.current = { id, x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" };
    window.addEventListener("pointermove", handleWindowMove);
    window.addEventListener("pointerup", handleWindowUp, { once: true });
    if (e.pointerType === "touch") {
      longPressTimer.current = window.setTimeout(() => {
        longPressTimer.current = null;
        arm(id);
      }, TOUCH_LONG_PRESS_MS);
    }
  }

  return { draggingId, dropIndex, setItemRef, onPointerDown };
}
