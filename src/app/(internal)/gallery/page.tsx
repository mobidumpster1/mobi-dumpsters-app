import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { GalleryImage } from "@/components/GalleryImage";
import { QuickPhotoUploadButton } from "@/components/QuickPhotoUploadButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { uploadGalleryPhoto, deleteGalleryPhoto } from "./actions";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type GalleryPhoto = {
  id: string;
  src: string;
  caption: string | null;
  type: string;
  mediaType: string;
  createdAt: Date;
  source: "Job" | "Equipment" | "Customer" | "General";
  contextLabel: string;
  contextHref: string | null;
  deleteId: string | null;
};

const SOURCES = ["All", "Job", "Equipment", "Customer", "General"] as const;
const MEDIA_TYPES = ["All", "Photo", "Video"] as const;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; media?: string }>;
}) {
  const user = await requireUser();
  const { source, media } = await searchParams;
  const activeSource = SOURCES.includes(source as (typeof SOURCES)[number])
    ? (source as (typeof SOURCES)[number])
    : "All";
  const activeMedia = MEDIA_TYPES.includes(media as (typeof MEDIA_TYPES)[number])
    ? (media as (typeof MEDIA_TYPES)[number])
    : "All";

  const [bookingPhotos, equipmentPhotos, customerPhotos, generalPhotos] = await Promise.all([
    db.photo.findMany({
      where: { booking: { organizationId: user.effectiveOrganizationId } },
      include: { booking: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.equipmentPhoto.findMany({
      where: { equipmentItem: { organizationId: user.effectiveOrganizationId } },
      include: { equipmentItem: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.customerPhoto.findMany({
      where: { customer: { organizationId: user.effectiveOrganizationId } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.galleryPhoto.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const photos: GalleryPhoto[] = [
    ...bookingPhotos.map((p): GalleryPhoto => ({
      id: `booking-${p.id}`,
      src: p.filePath,
      caption: p.caption,
      type: p.type,
      mediaType: p.mediaType,
      createdAt: p.createdAt,
      source: "Job",
      contextLabel: p.booking.customer.name,
      contextHref: `/bookings/${p.bookingId}`,
      deleteId: null,
    })),
    ...equipmentPhotos.map((p): GalleryPhoto => ({
      id: `equipment-${p.id}`,
      src: p.filePath,
      caption: p.caption,
      type: p.type,
      mediaType: p.mediaType,
      createdAt: p.createdAt,
      source: "Equipment",
      contextLabel: p.equipmentItem.label,
      contextHref: `/equipment/${p.equipmentItemId}`,
      deleteId: null,
    })),
    ...customerPhotos.map((p): GalleryPhoto => ({
      id: `customer-${p.id}`,
      src: p.filePath,
      caption: p.caption,
      type: p.type,
      mediaType: p.mediaType,
      createdAt: p.createdAt,
      source: "Customer",
      contextLabel: p.customer.name,
      contextHref: `/customers/${p.customerId}`,
      deleteId: null,
    })),
    ...generalPhotos.map((p): GalleryPhoto => ({
      id: `general-${p.id}`,
      src: p.filePath,
      caption: p.caption,
      type: "general",
      mediaType: p.mediaType,
      createdAt: p.createdAt,
      source: "General",
      contextLabel: p.caption ?? "General",
      contextHref: null,
      deleteId: p.id,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const bySource = activeSource === "All" ? photos : photos.filter((p) => p.source === activeSource);
  const filtered =
    activeMedia === "All"
      ? bySource
      : bySource.filter((p) => p.mediaType === activeMedia.toLowerCase());

  function withParam(key: "source" | "media", value: string) {
    const params = new URLSearchParams();
    const s = key === "source" ? value : activeSource;
    const m = key === "media" ? value : activeMedia;
    if (s !== "All") params.set("source", s);
    if (m !== "All") params.set("media", m);
    const qs = params.toString();
    return qs ? `/gallery?${qs}` : "/gallery";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Photo & Video Gallery</h1>
          <p className="mt-1 text-zinc-500">
            Every photo and video across jobs, equipment, and customers, newest first.
          </p>
        </div>
        <QuickPhotoUploadButton uploadAction={uploadGalleryPhoto} folder="gallery" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <Link
            key={s}
            href={withParam("source", s)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeSource === s
                ? "bg-brand text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {s === "All" ? "All Sources" : s}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {MEDIA_TYPES.map((m) => (
          <Link
            key={m}
            href={withParam("media", m)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeMedia === m
                ? "bg-ink text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {m === "All" ? "All Media" : `${m}s`}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((photo, i) => (
          <div
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <GalleryImage
              images={filtered.map((p) => ({
                src: p.src,
                alt: p.caption ?? p.type,
                isVideo: p.mediaType === "video",
              }))}
              index={i}
              className="h-32 w-full object-cover sm:h-36"
            />
            <div className="p-2">
              {photo.contextHref ? (
                <Link
                  href={photo.contextHref}
                  className="block truncate text-xs font-semibold text-ink hover:underline"
                >
                  {photo.contextLabel}
                </Link>
              ) : (
                <p className="truncate text-xs font-semibold text-ink">
                  {photo.contextLabel}
                </p>
              )}
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium capitalize text-zinc-600">
                  {photo.source} · {photo.type}
                </span>
                <span className="flex-shrink-0 text-[10px] text-zinc-400">
                  {formatDate(photo.createdAt)}
                </span>
              </div>
              {photo.deleteId && (
                <form action={deleteGalleryPhoto.bind(null, photo.deleteId)} className="mt-1">
                  <ConfirmButton
                    message={`Delete this ${photo.mediaType === "video" ? "video" : "photo"}?`}
                    className="text-[10px] text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            Nothing here yet.
          </p>
        )}
      </div>
    </div>
  );
}
