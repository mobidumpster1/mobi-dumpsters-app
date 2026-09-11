"use client";

import { useState } from "react";
import { SECTION_REGISTRY, FREE_CANVAS_META, type NormalSectionType } from "@/lib/websiteSections";

// Always rendered (never hover-only, so it's reachable via Tab) between
// every pair of sections and at the top/bottom of the list. Clicking opens
// an inline picker in place — same section types as the top toolbar — and
// inserts at this exact gap's index, via SectionEditor's insertSectionAt.
export function InsertSectionGap({
  onInsert,
  dropActive,
}: {
  onInsert: (type: NormalSectionType | "freeCanvas") => void;
  dropActive?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (dropActive) {
    return (
      <div className="relative -my-1.5 h-3">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-brand" />
      </div>
    );
  }

  if (open) {
    return (
      <div className="my-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-light p-2">
        {SECTION_REGISTRY.map((def) => (
          <button
            key={def.type}
            type="button"
            onClick={() => {
              onInsert(def.type);
              setOpen(false);
            }}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {def.icon} {def.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            onInsert("freeCanvas");
            setOpen(false);
          }}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          {FREE_CANVAS_META.icon} {FREE_CANVAS_META.label}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto text-xs text-zinc-400 hover:underline">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="group/gap relative -my-1.5 h-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Insert a section here"
        className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 items-center justify-center gap-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/gap:opacity-100"
      >
        <span className="h-px flex-1 bg-brand/40" />
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow">
          +
        </span>
        <span className="h-px flex-1 bg-brand/40" />
      </button>
    </div>
  );
}
