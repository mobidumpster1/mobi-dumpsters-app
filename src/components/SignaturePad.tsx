"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

// A finger/stylus signature capture — for signing a service agreement on
// an iPad at the job site, as opposed to the typed-name-plus-checkbox
// "signature" used for remote/online agreement signing. Uploads the
// drawn signature to Vercel Blob only once, right as the surrounding form
// is submitted (not on every stroke), by intercepting that form's submit
// event the same way ImageUploadField blocks submission during an upload —
// here it also has to do the upload itself first, since there's no
// natural "file selected" moment to hook into.
export function SignaturePad({
  name,
  folder,
  required,
}: {
  name: string;
  folder: string;
  required?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#18181b";
    }
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = canvas.getContext("2d");
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const { x, y } = getPos(e);
    const ctx = canvas?.getContext("2d");
    ctx?.lineTo(x, y);
    ctx?.stroke();
    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setHasDrawn(true);
    }
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setHasDrawn(false);
    setError(null);
    if (hiddenInputRef.current) hiddenInputRef.current.value = "";
  }

  const uploadSignature = useCallback(async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return null;
    const filename = `signature-${Date.now()}.png`;
    const result = await upload(`${folder}/${filename}`, blob, {
      access: "public",
      handleUploadUrl: "/api/blob-upload",
      contentType: "image/png",
    });
    return result.url;
  }, [folder]);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;

    function handleSubmit(e: SubmitEvent) {
      if (hiddenInputRef.current?.value) return;
      if (!hasDrawnRef.current) {
        if (required) {
          e.preventDefault();
          setError("Please sign above before submitting.");
        }
        return;
      }
      e.preventDefault();
      setUploading(true);
      setError(null);
      uploadSignature()
        .then((url) => {
          if (hiddenInputRef.current) hiddenInputRef.current.value = url ?? "";
          setUploading(false);
          form!.requestSubmit();
        })
        .catch((err) => {
          setUploading(false);
          setError(err instanceof Error ? err.message : "Couldn't save the signature");
        });
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [required, uploadSignature]);

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <input ref={hiddenInputRef} type="hidden" name={name} />
      <div className="overflow-hidden rounded-xl border-2 border-zinc-900 bg-white">
        <canvas
          ref={canvasRef}
          className="h-48 w-full touch-none"
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          className="text-sm font-semibold text-zinc-500 hover:underline"
        >
          Clear
        </button>
        {uploading && (
          <span className="text-xs text-amber-600">Saving signature…</span>
        )}
      </div>
      {!hasDrawn && (
        <p className="text-xs text-zinc-400">
          Sign above with your finger or a stylus.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
