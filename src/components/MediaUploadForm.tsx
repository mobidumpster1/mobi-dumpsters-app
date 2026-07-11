"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Field, inputClass } from "@/components/Field";

type TypeOption = { value: string; label: string };

// Uploads photos or videos straight from the browser to Vercel Blob (see
// src/app/api/blob-upload/route.ts), then hands the resulting URL off to a
// server action to create the DB record. Going client-side like this is
// required for video: routing the file through a server action/API route
// first would hit Vercel's ~4.5MB serverless request body limit almost
// immediately.
export function MediaUploadForm({
  uploadAction,
  typeOptions,
  defaultType,
  folder,
}: {
  uploadAction: (data: {
    filePath: string;
    mediaType: string;
    type: string;
    caption: string;
  }) => Promise<void>;
  typeOptions: TypeOption[];
  defaultType: string;
  folder: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(defaultType);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const mediaType = file.type.startsWith("video/") ? "video" : "photo";
      const blob = await upload(`${folder}/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
        multipart: mediaType === "video",
      });
      await uploadAction({ filePath: blob.url, mediaType, type, caption });
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-3 rounded-lg border-2 border-zinc-900 bg-white p-5"
    >
      <div className="flex gap-3">
        <Field label="Type" htmlFor="type">
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Caption (optional)" htmlFor="caption">
          <input
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Photo or video" htmlFor="file">
        <input
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept="image/*,video/*"
          required
          className={inputClass}
        />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}
