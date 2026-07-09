"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

// A single tap-to-pick button instead of a form with type/caption fields —
// for spots where photos don't need categorizing (e.g. the Gallery's
// general uploads). Supports picking multiple files at once and uploads
// each in turn. No `capture` attribute on the file input, so mobile shows
// the normal "Photo Library or Camera" chooser instead of jumping straight
// into the camera.
export function QuickPhotoUploadButton({
  uploadAction,
  folder,
}: {
  uploadAction: (data: {
    filePath: string;
    mediaType: string;
    type: string;
    caption: string;
  }) => Promise<void>;
  folder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStatus(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
      try {
        const mediaType = file.type.startsWith("video/") ? "video" : "photo";
        const blob = await upload(`${folder}/${Date.now()}-${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
          multipart: mediaType === "video",
        });
        await uploadAction({ filePath: blob.url, mediaType, type: "general", caption: "" });
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Upload failed");
        return;
      }
    }
    setStatus(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status !== null}
        className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {status ?? "+ Add Photos"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
