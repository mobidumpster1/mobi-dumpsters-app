"use client";

import { useState } from "react";
import { BuilderCanvas } from "./BuilderCanvas";
import { SectionEditor } from "./SectionEditor";
import type { Block } from "@/lib/websiteBuilder";
import type { SectionInstance } from "@/lib/websiteSections";

type CanvasProps = {
  initialBlocks: Block[];
  canvasWidth: number;
  canvasHeight: number;
  initialPublished: boolean;
  previewUrl: string;
};

type SectionsProps = {
  initialSections: SectionInstance[];
  initialPublished: boolean;
  previewUrl: string;
};

// Switching tabs is purely a local view toggle — it never touches which
// mode is actually live (see setBuilderMode/togglePublished). Editing
// Sections doesn't lose your Canvas work and vice versa; only hitting
// Publish in one of them changes which one customers see.
export function BuilderModeTabs({
  initialMode,
  canvasProps,
  sectionsProps,
}: {
  initialMode: "canvas" | "sections";
  canvasProps: CanvasProps;
  sectionsProps: SectionsProps;
}) {
  const [mode, setMode] = useState(initialMode);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("sections")}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            mode === "sections" ? "bg-ink text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Sections
        </button>
        <button
          type="button"
          onClick={() => setMode("canvas")}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            mode === "canvas" ? "bg-ink text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Canvas
        </button>
        <p className="ml-2 self-center text-xs text-zinc-500">
          {mode === "sections"
            ? "Sections stack top to bottom — always safe on mobile."
            : "Free-position blocks — full control, but you're responsible for how it looks on small screens."}
        </p>
      </div>

      {mode === "sections" ? <SectionEditor {...sectionsProps} /> : <BuilderCanvas {...canvasProps} />}
    </div>
  );
}
