"use client";

import { useState } from "react";

type SharePhoto = { src: string; alt: string };

// Copy/paste always works with zero setup. When a Facebook Page is
// connected (Settings > Integrations), a real "Post to Facebook Page"
// button appears alongside it — same photo/caption picker either way.
export function FacebookShareBox({
  photos,
  defaultCaption,
  facebookPageUrl,
  isConnected,
  postAction,
}: {
  photos: SharePhoto[];
  defaultCaption: string;
  facebookPageUrl: string | null;
  isConnected: boolean;
  postAction?: (imageUrl: string, message: string) => Promise<void>;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caption, setCaption] = useState(defaultCaption);
  const [copied, setCopied] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<"success" | "error" | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const selected = photos[selectedIndex];

  async function handlePost() {
    if (!selected || !postAction) return;
    setPosting(true);
    setPostResult(null);
    setPostError(null);
    try {
      await postAction(selected.src, caption);
      setPostResult("success");
    } catch (err) {
      setPostResult("error");
      setPostError(err instanceof Error ? err.message : "Couldn't post to Facebook.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-lg font-semibold text-ink">Share to Facebook</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {isConnected
          ? "Pick a photo, tweak the caption, and post it straight to your Page — or copy/paste it yourself instead."
          : "Pick a photo, tweak the caption if you want, then copy it, download the photo, and paste both into a new post on your Page."}
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
        className="mt-4 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base text-zinc-900 focus:border-brand focus:outline-none sm:text-sm"
      />

      {postResult === "success" && (
        <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Posted to your Facebook Page.
        </p>
      )}
      {postResult === "error" && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{postError}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        {isConnected && postAction && (
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || !selected}
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {posting ? "Posting…" : "Post to Facebook Page"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(caption);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={
            isConnected
              ? "rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              : "rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          }
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
