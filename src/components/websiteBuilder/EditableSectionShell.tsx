"use client";

import { useEffect, useRef, useState } from "react";

const TOOLBAR_HEIGHT_PX = 44;

// Wraps one section in the editor's live list with a hover outline and a
// floating toolbar (move/duplicate/settings/delete) plus drag-to-reorder —
// the "form panel" this replaces is gone; editing now happens on the
// rendered section itself (see EditableText / SectionRenderer /
// CanvasRenderer), and this shell only adds the chrome around it.
export function EditableSectionShell({
  icon,
  label,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDuplicate,
  onDelete,
  onOpenSettings,
  hasSettings,
  isDragging,
  registerRef,
  onPointerDown,
  children,
}: {
  icon: string;
  label: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenSettings?: () => void;
  hasSettings: boolean;
  isDragging: boolean;
  registerRef: (el: HTMLElement | null) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  children: React.ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    function updateFlip() {
      const rect = shellRef.current?.getBoundingClientRect();
      if (rect) setFlip(rect.top < TOOLBAR_HEIGHT_PX);
    }
    updateFlip();
    window.addEventListener("scroll", updateFlip, true);
    window.addEventListener("resize", updateFlip);
    return () => {
      window.removeEventListener("scroll", updateFlip, true);
      window.removeEventListener("resize", updateFlip);
    };
  }, []);

  return (
    <div
      ref={(el) => {
        shellRef.current = el;
        registerRef(el);
      }}
      onPointerDown={onPointerDown}
      className={`group/section relative rounded-lg outline outline-2 outline-offset-2 outline-transparent transition-opacity hover:outline-zinc-300 focus-within:outline-brand/60 ${isDragging ? "opacity-40" : ""}`}
    >
      <div
        className={`absolute right-2 z-20 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 opacity-0 shadow-md transition-opacity pointer-events-none group-hover/section:opacity-100 group-hover/section:pointer-events-auto group-focus-within/section:opacity-100 group-focus-within/section:pointer-events-auto ${
          flip ? "top-full mt-1" : "-top-1 -translate-y-full"
        }`}
      >
        <span className="mr-1 flex items-center gap-1 px-1 text-xs font-semibold text-zinc-400">
          <span>{icon}</span>
          {label}
        </span>
        <ToolbarButton label="Move up" onClick={onMoveUp} disabled={!canMoveUp}>
          ↑
        </ToolbarButton>
        <ToolbarButton label="Move down" onClick={onMoveDown} disabled={!canMoveDown}>
          ↓
        </ToolbarButton>
        <ToolbarButton label="Duplicate" onClick={onDuplicate}>
          ⧉
        </ToolbarButton>
        {hasSettings && (
          <ToolbarButton label="Settings" onClick={onOpenSettings}>
            ⚙
          </ToolbarButton>
        )}
        <ToolbarButton label="Delete" onClick={onDelete} danger>
          🗑
        </ToolbarButton>
      </div>
      {children}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-sm hover:bg-zinc-100 disabled:opacity-30 ${
        danger ? "text-red-600" : "text-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}
