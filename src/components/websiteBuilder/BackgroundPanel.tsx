"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  DEFAULT_OVERLAY,
  formatFileSize,
  luminanceWithOverlay,
  contrastAgainstLuminance,
  type Overlay,
  type SectionBackground,
} from "@/lib/websiteBuilderMedia";
import { WCAG_AA_LARGE } from "@/lib/websiteBuilderTheme";
import type { SectionWidthMode } from "@/lib/websiteSections";

const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;

type BackgroundType = SectionBackground["type"];

// Reached from a section's Settings gear (Hero/CtaBanner only — see
// SECTION_REGISTRY's supportsBackground). Color/Image/Video type picker,
// upload + transcode progress for video, overlay + text-shadow controls,
// and a non-blocking contrast warning sampled from the actual poster/image.
export function BackgroundPanel({
  background,
  widthMode,
  onChangeBackground,
  onChangeWidthMode,
  headlineColor,
  onClose,
}: {
  background: SectionBackground;
  widthMode: SectionWidthMode;
  onChangeBackground: (next: SectionBackground, coalesce?: boolean) => void;
  onChangeWidthMode: (next: SectionWidthMode) => void;
  headlineColor: string;
  onClose: () => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [contrastWarning, setContrastWarning] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const overlay: Overlay = (background.type === "image" || background.type === "video") ? background.overlay : DEFAULT_OVERLAY;
  const textShadow = (background.type === "image" || background.type === "video") ? background.textShadow : false;

  function checkContrast(imageUrl: string, withOverlay: Overlay) {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 40; // a small downsample is plenty for an average-luminance estimate
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        const avgLuminance = total / (data.length / 4) / 255;
        const blended = luminanceWithOverlay(avgLuminance, withOverlay);
        const ratio = contrastAgainstLuminance(blended, headlineColor);
        setContrastWarning(
          ratio < WCAG_AA_LARGE
            ? `The headline may be hard to read over this background (contrast ${ratio.toFixed(1)}:1 — aim for ${WCAG_AA_LARGE}:1). Try a darker overlay or a text shadow.`
            : null
        );
      } catch {
        // Cross-origin sampling can fail silently depending on the CDN's
        // CORS headers — the warning is a nice-to-have, not load-bearing,
        // so just skip it rather than surface a confusing error.
        setContrastWarning(null);
      }
    };
    img.onerror = () => setContrastWarning(null);
    img.src = imageUrl;
  }

  async function handleImageFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const blob = await upload(`website-builder/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      const dims = await readImageDimensions(blob.url);
      const next: SectionBackground = {
        type: "image",
        imageUrl: blob.url,
        imageWidth: dims.width,
        imageHeight: dims.height,
        overlay: overlay,
        textShadow,
      };
      onChangeBackground(next);
      checkContrast(blob.url, overlay);
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoFile(file: File) {
    setUploadError(null);
    if (file.size > MAX_VIDEO_BYTES) {
      setUploadError(`That video is ${Math.round(file.size / (1024 * 1024))}MB — try a clip under ${MAX_VIDEO_SECONDS} seconds and under ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB.`);
      return;
    }
    const duration = await readVideoDuration(file).catch(() => null);
    if (duration != null && duration > MAX_VIDEO_SECONDS) {
      setUploadError(`That clip is ${Math.round(duration)}s — try something under ${MAX_VIDEO_SECONDS} seconds.`);
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(`website-builder/video/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      setUploading(false);
      setProcessing(true);
      const res = await fetch("/api/transcode-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: blob.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Video processing failed.");
      const next: SectionBackground = {
        type: "video",
        videoUrl: data.videoUrl,
        webmUrl: data.webmUrl,
        posterUrl: data.posterUrl,
        posterWidth: data.posterWidth,
        posterHeight: data.posterHeight,
        fileSizeBytes: data.fileSizeBytes,
        playOnMobile: false,
        overlay,
        textShadow,
      };
      onChangeBackground(next);
      checkContrast(data.posterUrl, overlay);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Video processing failed — try a shorter clip.");
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  }

  async function handlePosterFile(file: File) {
    if (background.type !== "video") return;
    setUploading(true);
    try {
      const blob = await upload(`website-builder/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      const dims = await readImageDimensions(blob.url);
      onChangeBackground({ ...background, posterUrl: blob.url, posterWidth: dims.width, posterHeight: dims.height });
      checkContrast(blob.url, overlay);
    } finally {
      setUploading(false);
    }
  }

  // Grabs whatever frame the preview <video> is currently paused on and
  // uploads it as the poster — cheaper and faster than a second
  // server-side transcode round trip just to re-pick a frame.
  async function useCurrentFrameAsPoster() {
    const video = previewVideoRef.current;
    if (!video || background.type !== "video") return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return;
    setUploading(true);
    try {
      const file = new File([blob], "poster.jpg", { type: "image/jpeg" });
      const uploaded = await upload(`website-builder/${Date.now()}-poster.jpg`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      onChangeBackground({ ...background, posterUrl: uploaded.url, posterWidth: canvas.width, posterHeight: canvas.height });
      checkContrast(uploaded.url, overlay);
    } finally {
      setUploading(false);
    }
  }

  function updateOverlay(patch: Partial<Overlay>) {
    if (background.type !== "image" && background.type !== "video") return;
    const nextOverlay = { ...overlay, ...patch };
    onChangeBackground({ ...background, overlay: nextOverlay } as SectionBackground, true);
    const sampleUrl = background.type === "video" ? background.posterUrl : background.imageUrl;
    checkContrast(sampleUrl, nextOverlay);
  }

  function setType(type: BackgroundType) {
    if (type === "color") onChangeBackground({ type: "color" });
    setContrastWarning(null);
  }

  return (
    <div className="mx-3 mt-1 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500">Section</p>
        <button type="button" onClick={onClose} className="text-xs text-zinc-400 hover:underline">
          Done
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={widthMode === "full"}
          onChange={(e) => onChangeWidthMode(e.target.checked ? "full" : "contained")}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Full width (background spans edge to edge; content stays readable in the middle)
      </label>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-zinc-500">Background</p>
        <div className="flex gap-1.5">
          {(["color", "image", "video"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => (type === "color" ? setType(type) : type === "image" ? imageInputRef.current?.click() : videoInputRef.current?.click())}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold capitalize ${
                background.type === type ? "border-brand bg-brand-light text-ink" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageFile(file);
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleVideoFile(file);
          }}
        />
        {uploading && <p className="mt-1.5 text-xs text-amber-600">Uploading…</p>}
        {processing && <p className="mt-1.5 text-xs text-amber-600">Processing video — resizing, trimming, and stripping audio…</p>}
        {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
      </div>

      {background.type === "video" && (
        <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-2.5">
          <p className="text-xs text-zinc-500">
            Delivered size: <span className="font-semibold text-zinc-700">{formatFileSize(background.fileSizeBytes)}</span> (mp4 + webm combined)
          </p>
          <video ref={previewVideoRef} src={background.videoUrl} poster={background.posterUrl} controls muted className="w-full rounded-md" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={useCurrentFrameAsPoster} className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
              Use this frame as poster
            </button>
            <button type="button" onClick={() => posterInputRef.current?.click()} className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
              Upload your own poster
            </button>
            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePosterFile(file);
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={background.playOnMobile}
              onChange={(e) => onChangeBackground({ ...background, playOnMobile: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Play video on mobile (off by default — autoplaying video on cellular can feel broken)
          </label>
        </div>
      )}

      {(background.type === "image" || background.type === "video") && (
        <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-2.5">
          <p className="text-xs font-semibold text-zinc-500">Overlay (for text legibility)</p>
          <div className="flex items-center gap-3">
            <input type="color" value={overlay.color} onChange={(e) => updateOverlay({ color: e.target.value })} className="h-8 w-12 rounded border border-zinc-300" />
            <label className="flex flex-1 items-center gap-2 text-xs text-zinc-600">
              Opacity
              <input
                type="range"
                min={0}
                max={90}
                value={overlay.opacity}
                onChange={(e) => updateOverlay({ opacity: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="w-8 text-right">{overlay.opacity}%</span>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={overlay.gradient} onChange={(e) => updateOverlay({ gradient: e.target.checked })} className="h-4 w-4 rounded border-zinc-300" />
            Gradient (darker toward the bottom) instead of flat
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={textShadow}
              onChange={(e) => onChangeBackground({ ...background, textShadow: e.target.checked } as SectionBackground)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Add a text shadow behind the headline
          </label>
          {contrastWarning && (
            <p className="rounded border border-amber-300 bg-amber-50 p-1.5 text-xs text-amber-800">⚠ {contrastWarning}</p>
          )}
        </div>
      )}
    </div>
  );
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 800 });
    img.onerror = () => resolve({ width: 1200, height: 800 });
    img.src = url;
  });
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Could not read video metadata"));
    video.src = URL.createObjectURL(file);
  });
}
