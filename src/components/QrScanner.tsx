"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

// Decodes camera frames client-side with jsQR rather than the still-
// unsupported-in-Safari BarcodeDetector API, so this works the same across
// iOS/Android/desktop. A phone's stock camera app can also scan the same
// codes directly (they're just URLs) — this is a same-page convenience,
// not the only way to scan.
export function QrScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            try {
              const url = new URL(code.data);
              stream?.getTracks().forEach((t) => t.stop());
              router.push(url.pathname + url.search);
              return;
            } catch {
              // Not a valid absolute URL — keep scanning, might just be
              // noise/a partial frame.
            }
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setError(
          "Couldn't access the camera. Check permissions, or use your phone's camera app to scan instead."
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="w-full" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {error && (
        <p className="mt-4 max-w-sm text-center text-sm text-red-300">{error}</p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-6 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-ink"
      >
        Close
      </button>
    </div>
  );
}
