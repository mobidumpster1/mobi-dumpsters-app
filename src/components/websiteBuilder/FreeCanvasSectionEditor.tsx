"use client";

import { useState } from "react";
import { CanvasRenderer } from "./CanvasRenderer";
import { BlockInspector } from "./BlockInspector";
import { TemplatePicker } from "./TemplatePicker";
import { createDefaultBlock, type Block } from "@/lib/websiteBuilder";
import type { FreeCanvasSectionInstance } from "@/lib/websiteSections";

const TALLER_CANVAS_STEP = 200;

const PALETTE: { type: Block["type"]; label: string }[] = [
  { type: "text", label: "+ Text" },
  { type: "image", label: "+ Image" },
  { type: "bookingWidget", label: "+ Booking Widget" },
  { type: "button", label: "+ Button" },
  { type: "shape", label: "+ Shape" },
  { type: "html", label: "+ HTML" },
];

// The old BuilderCanvas, minus Save/Publish/Preview — this now edits one
// section's blocks in place, and the page-level Save/Publish (in
// SectionEditor) covers it along with every other section. Everything
// about the actual block editing (drag/resize/grid-snap/labels, the
// inspector, starter templates) is unchanged, just re-hosted to write
// into this section's props instead of a whole separate page.
export function FreeCanvasSectionEditor({
  section,
  onChange,
  canUseHtml,
}: {
  section: FreeCanvasSectionInstance;
  onChange: (props: FreeCanvasSectionInstance["props"]) => void;
  canUseHtml: boolean;
}) {
  const { blocks, designWidth, height } = section.props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  function setBlocks(next: Block[]) {
    onChange({ ...section.props, blocks: next });
  }

  function addBlock(type: Block["type"]) {
    const block = createDefaultBlock(type, designWidth);
    setBlocks([...blocks, block]);
    setSelectedId(block.id);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  }

  function deleteBlock(id: string) {
    setBlocks(blocks.filter((b) => b.id !== id));
    setSelectedId(null);
  }

  function bringToFront(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    setBlocks([...blocks.filter((b) => b.id !== id), block]);
  }

  function sendToBack(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    setBlocks([block, ...blocks.filter((b) => b.id !== id)]);
  }

  function chooseTemplate(templateBlocks: Block[], width: number, templateHeight: number) {
    onChange({ designWidth: width, height: templateHeight, blocks: templateBlocks });
    setSelectedId(null);
  }

  function startOver() {
    if (blocks.length > 0 && !window.confirm("Clear this layout and choose a different starting point?")) {
      return;
    }
    setBlocks([]);
    setSelectedId(null);
  }

  function addTallerCanvas() {
    onChange({ ...section.props, height: height + TALLER_CANVAS_STEP });
  }

  if (blocks.length === 0) {
    return <TemplatePicker onChoose={chooseTemplate} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        {PALETTE.map((p) => {
          const locked = p.type === "html" && !canUseHtml;
          return (
            <button
              key={p.type}
              type="button"
              onClick={() => !locked && addBlock(p.type)}
              disabled={locked}
              title={locked ? "HTML embeds need the Pro plan" : undefined}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {p.label}
              {locked && " 🔒"}
            </button>
          );
        })}
        <button
          type="button"
          onClick={addTallerCanvas}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          + Taller Canvas
        </button>
        <button
          type="button"
          onClick={startOver}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Start Over
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div className="overflow-auto rounded-lg border-2 border-zinc-900 bg-zinc-100 p-4">
          <CanvasRenderer
            blocks={blocks}
            canvasWidth={designWidth}
            canvasHeight={height}
            editable
            selectedBlockId={selectedId}
            onSelect={setSelectedId}
            onChange={updateBlock}
          />
        </div>

        {selected ? (
          <BlockInspector
            block={selected}
            onChange={(patch) => updateBlock(selected.id, patch)}
            onDelete={() => deleteBlock(selected.id)}
            onBringToFront={() => bringToFront(selected.id)}
            onSendToBack={() => sendToBack(selected.id)}
          />
        ) : (
          <div className="flex w-64 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-400">
            Add a block from the toolbar, or click one on the canvas to edit it.
          </div>
        )}
      </div>
    </div>
  );
}
