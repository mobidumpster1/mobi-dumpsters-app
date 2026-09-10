"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import type { Block } from "@/lib/websiteBuilder";
import { Field, inputClass } from "@/components/Field";

const labelClass = "text-xs font-semibold text-zinc-500";

export function BlockInspector({
  block,
  onChange,
  onDelete,
  onBringToFront,
  onSendToBack,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await upload(`website-builder/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      onChange({ url: blob.url } as Partial<Block>);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex w-64 flex-shrink-0 flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wide text-zinc-500">
          {block.type === "bookingWidget" ? "Booking Widget" : block.type}
        </h3>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs font-semibold text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["x", "y", "width", "height"] as const).map((key) => (
          <Field key={key} label={key.toUpperCase()} htmlFor={`inspector-${key}`}>
            <input
              id={`inspector-${key}`}
              type="number"
              value={block[key]}
              onChange={(e) => onChange({ [key]: Number(e.target.value) || 0 } as Partial<Block>)}
              className={`${inputClass} py-1.5 text-sm`}
            />
          </Field>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBringToFront}
          className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Bring to Front
        </button>
        <button
          type="button"
          onClick={onSendToBack}
          className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Send to Back
        </button>
      </div>

      {block.type === "text" && (
        <>
          <Field label="Text" htmlFor="inspector-content">
            <textarea
              id="inspector-content"
              rows={3}
              value={block.content}
              onChange={(e) => onChange({ content: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Size" htmlFor="inspector-fontSize">
              <input
                id="inspector-fontSize"
                type="number"
                value={block.fontSize}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) || 16 })}
                className={`${inputClass} py-1.5 text-sm`}
              />
            </Field>
            <Field label="Color" htmlFor="inspector-color">
              <input
                id="inspector-color"
                type="color"
                value={block.color}
                onChange={(e) => onChange({ color: e.target.value })}
                className="h-9 w-full rounded-lg border border-zinc-300"
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={block.bold}
                onChange={(e) => onChange({ bold: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Bold
            </label>
            <select
              value={block.align}
              onChange={(e) => onChange({ align: e.target.value as "left" | "center" | "right" })}
              className={`${inputClass} py-1.5 text-sm`}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </>
      )}

      {block.type === "image" && (
        <>
          <p className={labelClass}>Image</p>
          <input type="file" accept="image/*" onChange={handleImageFile} className={inputClass} />
          {uploading && <p className="text-xs text-amber-600">Uploading…</p>}
          <Field label="Alt text (optional)" htmlFor="inspector-alt">
            <input
              id="inspector-alt"
              value={block.alt}
              onChange={(e) => onChange({ alt: e.target.value })}
              className={inputClass}
            />
          </Field>
        </>
      )}

      {block.type === "button" && (
        <>
          <Field label="Label" htmlFor="inspector-label">
            <input
              id="inspector-label"
              value={block.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Link (https://, tel:, or mailto:)" htmlFor="inspector-href">
            <input
              id="inspector-href"
              value={block.href}
              onChange={(e) => onChange({ href: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Color" htmlFor="inspector-btn-color">
            <input
              id="inspector-btn-color"
              type="color"
              value={block.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-9 w-full rounded-lg border border-zinc-300"
            />
          </Field>
        </>
      )}

      {block.type === "shape" && (
        <Field label="Color" htmlFor="inspector-shape-color">
          <input
            id="inspector-shape-color"
            type="color"
            value={block.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-9 w-full rounded-lg border border-zinc-300"
          />
        </Field>
      )}

      {block.type === "bookingWidget" && (
        <p className="text-xs text-zinc-500">
          Renders the real booking flow — nothing to configure here besides its position and size
          above.
        </p>
      )}
    </div>
  );
}
