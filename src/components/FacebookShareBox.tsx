"use client";

import { useState } from "react";

type SharePhoto = { src: string; alt: string };

// No Facebook API/account setup involved — this just prepares a caption and
// picks a photo so posting is copy/paste instead of writing from scratch.
// True auto-posting would need a Meta Developer App + Page token later.
export function FacebookShareBox({
  photos,
  defaultCaption,
  facebookPageUrl,
}: {
  photos: SharePhoto[];
  defaultCaption: string;
  facebookPageUrl: string | null;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caption, setCaption] = useState(defaultCaption);
  const [copied, setCopied] = useState(false);

  const selected = photos[selectedIndex];

  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-lg font-semibold text-ink">Share to Facebook</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Pick a photo, tweak the caption if you want, then copy it, download
        the photo, and paste both into a new post on your Page.
      </p>

      {photos.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 ${
                i === selectedIndex ? "border-brand" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={6}
        className="mt-4 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 focus:border-brand focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(caption);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          {copied ? "Copied!" : "Copy Caption"}
        </button>
        {selected && (
          <a
            href={selected.src}
            download
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Download Photo
          </a>
        )}
        <a
          href={facebookPageUrl || "https://www.facebook.com/"}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Open Facebook →
        </a>
      </div>
    </div>
  );
}
