"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Field, inputClass } from "@/components/Field";

// A single-image upload field for things like an equipment category's
// reference photo — uploads straight to Vercel Blob from the browser and
// keeps the resulting URL in a hidden input so it posts with the rest of
// the surrounding form.
export function ImageUploadField({
  name,
  label,
  initialUrl,
  folder,
}: {
  name: string;
  label: string;
  initialUrl: string | null;
  folder: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await upload(`${folder}/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      setUrl(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field label={label} htmlFor={`${name}-file`}>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-lg border border-zinc-200 object-cover"
          />
        )}
        <div className="flex flex-col gap-1">
          <input
            ref={fileInputRef}
            id={`${name}-file`}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className={inputClass}
          />
          {uploading && <p className="text-xs text-zinc-400">Uploading…</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {url && (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="self-start text-xs text-red-600 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}
