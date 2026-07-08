"use client";

import { useEffect, useState } from "react";

export type LightboxPhoto = { src: string; alt: string; isVideo?: boolean };

// Renders one thumbnail that, when clicked, opens a full-screen lightbox
// with Prev/Next navigation across every photo in the same gallery (passed
// in as `images`) — arrow keys and Escape work too. Videos render as a
// muted, controls-less <video> for the thumbnail (shows the first frame)
// and a playable <video> in the lightbox.
export function GalleryImage({
  images,
  index,
  className,
}: {
  images: LightboxPhoto[];
  index: number;
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;
  const current = isOpen ? images[openIndex] : null;

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") {
        setOpenIndex((i) => (i === null ? i : (i + 1) % images.length));
      }
      if (e.key === "ArrowLeft") {
        setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, images.length]);

  const thumb = images[index];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenIndex(index)}
        className="relative block w-full cursor-zoom-in"
      >
        {thumb.isVideo ? (
          <video src={thumb.src} muted playsInline className={className} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb.src} alt={thumb.alt} className={className} />
        )}
        {thumb.isVideo && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
              ▶
            </span>
          </span>
        )}
      </button>

      {current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex(null);
            }}
            className="absolute right-4 top-4 text-3xl font-bold text-white hover:opacity-70"
            aria-label="Close"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((openIndex! - 1 + images.length) % images.length);
                }}
                className="absolute left-4 text-4xl font-bold text-white hover:opacity-70"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((openIndex! + 1) % images.length);
                }}
                className="absolute right-4 text-4xl font-bold text-white hover:opacity-70"
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}

          {current.isVideo ? (
            <video
              src={current.src}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[90vw] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.src}
              alt={current.alt}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 text-sm text-white/70">
              {openIndex! + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
