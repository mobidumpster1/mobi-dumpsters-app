"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";

// Shared by Hero's photo and CanvasRenderer's image block — click anywhere
// on the image (or its empty placeholder) to pick a replacement, or drag a
// file onto it. Same @vercel/blob/client upload() call BlockInspector.tsx
// and SectionPropForm.tsx already use, just triggered from the image
// itself instead of a side-panel file input.
export function EditableImage({
  url,
  alt,
  editable,
  onChange,
  className,
  style,
  emptyLabel = "Click to add a photo",
}: {
  url: string | null;
  alt: string;
  editable: boolean;
  onChange: (url: string) => void;
  className?: string;
  style?: React.CSSProperties;
  emptyLabel?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const blob = await upload(`website-builder/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      onChange(blob.url);
    } finally {
      setUploading(false);
    }
  }

  if (!editable) {
    return url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={alt} className={className} style={style} />
    ) : null;
  }

  return (
    <div
      className={`relative cursor-pointer overflow-hidden ${className ?? ""}`}
      style={style}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400">
          {emptyLabel}
        </div>
      )}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-zinc-600">
          Uploading…
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
