"use client";

import { useState } from "react";
import { CanvasRenderer } from "./CanvasRenderer";
import { BlockInspector } from "./BlockInspector";
import { TemplatePicker } from "./TemplatePicker";
import { createDefaultBlock, type Block } from "@/lib/websiteBuilder";
import { saveWebsiteBuilderPage, togglePublished } from "@/app/(internal)/website-builder/actions";

const TALLER_CANVAS_STEP = 200;

const PALETTE: { type: Block["type"]; label: string }[] = [
  { type: "text", label: "+ Text" },
  { type: "image", label: "+ Image" },
  { type: "bookingWidget", label: "+ Booking Widget" },
  { type: "button", label: "+ Button" },
  { type: "shape", label: "+ Shape" },
  { type: "html", label: "+ HTML" },
];

export function BuilderCanvas({
  initialBlocks,
  canvasWidth: initialCanvasWidth,
  canvasHeight: initialCanvasHeight,
  initialPublished,
  previewUrl,
}: {
  initialBlocks: Block[];
  canvasWidth: number;
  canvasHeight: number;
  initialPublished: boolean;
  previewUrl: string;
}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [canvasWidth, setCanvasWidth] = useState(initialCanvasWidth);
  const [canvasHeight, setCanvasHeight] = useState(initialCanvasHeight);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  function addBlock(type: Block["type"]) {
    const block = createDefaultBlock(type, canvasWidth);
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId(null);
  }

  function bringToFront(id: string) {
    setBlocks((prev) => {
      const block = prev.find((b) => b.id === id);
      if (!block) return prev;
      return [...prev.filter((b) => b.id !== id), block];
    });
  }

  function sendToBack(id: string) {
    setBlocks((prev) => {
      const block = prev.find((b) => b.id === id);
      if (!block) return prev;
      return [block, ...prev.filter((b) => b.id !== id)];
    });
  }

  function chooseTemplate(templateBlocks: Block[], width: number, height: number) {
    setBlocks(templateBlocks);
    setCanvasWidth(width);
    setCanvasHeight(height);
    setSelectedId(null);
  }

  function startOver() {
    if (blocks.length > 0 && !window.confirm("Clear the current layout and choose a different starting point?")) {
      return;
    }
    setBlocks([]);
    setSelectedId(null);
  }

  function addTallerCanvas() {
    setCanvasHeight((h) => h + TALLER_CANVAS_STEP);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("blocksJson", JSON.stringify(blocks));
      formData.set("canvasWidth", String(canvasWidth));
      formData.set("canvasHeight", String(canvasHeight));
      await saveWebsiteBuilderPage(formData);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublished() {
    const next = !published;
    setPublished(next);
    await togglePublished(next, "canvas");
  }

  if (blocks.length === 0) {
    return <TemplatePicker onChoose={chooseTemplate} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-zinc-900 bg-white p-3">
        {PALETTE.map((p) => (
          <button
            key={p.type}
            type="button"
            onClick={() => addBlock(p.type)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={addTallerCanvas}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          + Taller Canvas
        </button>
        <button
          type="button"
          onClick={startOver}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Start Over
        </button>
        <div className="ml-auto flex items-center gap-2">
          {savedAt && !saving && <span className="text-xs text-zinc-400">Saved</span>}
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Preview
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleTogglePublished}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold text-white ${published ? "bg-green-700 hover:bg-green-800" : "bg-zinc-400 hover:bg-zinc-500"}`}
          >
            {published ? "Published — customers see this" : "Not published"}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="overflow-auto rounded-lg border-2 border-zinc-900 bg-zinc-100 p-4">
          <CanvasRenderer
            blocks={blocks}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
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
