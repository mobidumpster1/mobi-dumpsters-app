import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StatusQuickSelect } from "@/components/StatusQuickSelect";
import { formatAttributeValue, parseAttributes, parseFieldDefinitions } from "@/lib/categoryFields";
import { uploadEquipmentPhoto, deleteEquipmentPhoto } from "../photoActions";
import { quickSetEquipmentStatus } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { GalleryImage } from "@/components/GalleryImage";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 86_400_000;

function formatDateTime(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await db.equipmentItem.findUnique({
    where: { id },
    include: {
      category: true,
      currentCustomer: true,
      locationEvents: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { customer: true },
      },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!item) notFound();

  const fieldDefs = parseFieldDefinitions(item.category.fieldDefinitions);
  const attributes = parseAttributes(item.attributes);
  const uploadWithId = uploadEquipmentPhoto.bind(null, item.id);

  const openEvent = item.locationEvents.find((e) => e.endedAt === null);
  const daysAtSite = openEvent
    ? Math.floor((new Date().getTime() - openEvent.startedAt.getTime()) / MS_PER_DAY)
    : null;
  const isAging =
    Boolean(openEvent) &&
    openEvent?.location !== "Yard" &&
    daysAtSite !== null &&
    daysAtSite > item.category.agingThresholdDays;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {item.label}
          </h1>
          <p className="mt-1 text-zinc-500">{item.category.name}</p>
        </div>
        <Link
          href={`/equipment/${item.id}/edit`}
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Edit
        </Link>
      </div>

      {isAging && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Sitting too long — {daysAtSite} days at this site (threshold is{" "}
          {item.category.agingThresholdDays} days for {item.category.name}).
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Status</dt>
          <dd className="mt-1">
            <StatusQuickSelect
              itemId={item.id}
              currentStatus={item.status}
              action={quickSetEquipmentStatus}
            />
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Location / Customer</dt>
          <dd className="text-zinc-900">
            {item.currentCustomer
              ? item.currentCustomer.name
              : (item.currentLocation ?? "Yard")}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Days at Current Site</dt>
          <dd className="text-zinc-900">
            {daysAtSite !== null && openEvent?.location !== "Yard"
              ? `${daysAtSite} days`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Asset Tag</dt>
          <dd className="text-zinc-900">{item.assetTag ?? "—"}</dd>
        </div>
        {fieldDefs.map((field) => (
          <div key={field.key}>
            <dt className="text-zinc-500">{field.label}</dt>
            <dd className="text-zinc-900">
              {formatAttributeValue(field, attributes[field.key])}
            </dd>
          </div>
        ))}
        {item.notes && (
          <div className="col-span-full">
            <dt className="text-zinc-500">Notes</dt>
            <dd className="text-zinc-900">{item.notes}</dd>
          </div>
        )}
      </dl>

      <h2 className="mt-8 text-xl font-semibold text-ink">Location History</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Location</th>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">From</th>
              <th className="px-5 py-3.5 font-semibold">To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {item.locationEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-5 py-4 font-medium text-zinc-900">
                  {event.location}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {event.customer?.name ?? "—"}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {formatDateTime(event.startedAt)}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {event.endedAt ? formatDateTime(event.endedAt) : "Present"}
                </td>
              </tr>
            ))}
            {item.locationEvents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">
                  No location history yet — this starts once the item is
                  marked delivered on a booking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">Condition Photos</h2>
      <form
        action={uploadWithId}
        className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="flex gap-3">
          <Field label="Type" htmlFor="type">
            <select id="type" name="type" defaultValue="condition" className={inputClass}>
              <option value="condition">Condition</option>
              <option value="damage">Damage</option>
              <option value="repair">Repair</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Caption (optional)" htmlFor="caption">
            <input id="caption" name="caption" className={inputClass} />
          </Field>
        </div>
        <Field label="Photo" htmlFor="file">
          <input
            id="file"
            name="file"
            type="file"
            accept="image/*"
            required
            className={inputClass}
          />
        </Field>
        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Upload Photo
          </button>
        </div>
      </form>

      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {item.photos.map((photo, i) => (
          <div
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <GalleryImage
              images={item.photos.map((p) => ({
                src: `/api/uploads/${p.filePath}`,
                alt: p.caption ?? p.type,
              }))}
              index={i}
              className="h-40 w-full object-cover"
            />
            <div className="p-2">
              <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600">
                {photo.type}
              </span>
              {photo.caption && (
                <p className="mt-1 text-xs text-zinc-600">{photo.caption}</p>
              )}
              <form action={deleteEquipmentPhoto.bind(null, photo.id)} className="mt-1">
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {item.photos.length === 0 && (
          <p className="col-span-full text-center text-zinc-400">
            No photos yet.
          </p>
        )}
      </div>
    </div>
  );
}
