"use client";

import { useState } from "react";
import { GalleryImage } from "@/components/GalleryImage";
import { ConfirmButton } from "@/components/ConfirmButton";

export type MediaGridItem = {
  id: string;
  filePath: string;
  mediaType: string; // "photo" | "video"
  type: string;
  caption: string | null;
};

// Splits a mixed photo/video collection into "All / Photos / Videos" tabs
// and renders the filtered grid, each tile deletable via the passed-in
// server action (still wired up as a real <form action> so it works
// without JS and matches the rest of the app's delete pattern).
export function MediaGrid({
  items,
  deleteAction,
}: {
  items: MediaGridItem[];
  deleteAction: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"all" | "photo" | "video">("all");
  const photoCount = items.filter((i) => i.mediaType !== "video").length;
  const videoCount = items.filter((i) => i.mediaType === "video").length;
  const filtered = tab === "all" ? items : items.filter((i) => i.mediaType === tab);

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["all", `All (${items.length})`],
            ["photo", `Photos (${photoCount})`],
            ["video", `Videos (${videoCount})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === value
                ? "bg-brand text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((item, i) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-lg border-2 border-zinc-900 bg-white"
          >
            <GalleryImage
              images={filtered.map((p) => ({
                src: p.filePath,
                alt: p.caption ?? p.type,
                isVideo: p.mediaType === "video",
              }))}
              index={i}
              className="h-40 w-full object-cover"
            />
            <div className="p-2">
              <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600">
                {item.type}
              </span>
              {item.caption && (
                <p className="mt-1 text-xs text-zinc-600">{item.caption}</p>
              )}
              <form action={deleteAction.bind(null, item.id)} className="mt-1">
                <ConfirmButton
                  message={`Delete this ${item.mediaType === "video" ? "video" : "photo"}?`}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-zinc-400">
            No {tab === "all" ? "photos or videos" : `${tab}s`} yet.
          </p>
        )}
      </div>
    </>
  );
}
