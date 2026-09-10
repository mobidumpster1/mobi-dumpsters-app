"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { uploadMyAvatar, removeMyAvatar } from "./actions";

export function AvatarUpload({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      await uploadMyAvatar(formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setUploading(true);
    setError(null);
    try {
      await removeMyAvatar();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar userId={userId} name={name} avatarUrl={avatarUrl} size={56} />
      <div className="flex flex-col gap-1">
        <div className="flex gap-3">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-semibold text-brand hover:underline disabled:opacity-60"
          >
            {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
