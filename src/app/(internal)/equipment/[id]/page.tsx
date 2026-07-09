import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StatusQuickSelect } from "@/components/StatusQuickSelect";
import { formatAttributeValue, parseAttributes, parseFieldDefinitions } from "@/lib/categoryFields";
import { uploadEquipmentPhoto, deleteEquipmentPhoto } from "../photoActions";
import { quickSetEquipmentStatus } from "../actions";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { MediaGrid } from "@/components/MediaGrid";
import { LocationMap } from "@/components/LocationMap";
import { branding } from "@/lib/branding";

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

      {(() => {
        // Out on a job — pin the current customer's address, if it's
        // geocoded. Otherwise it's sitting at the yard, which always has a
        // known location since it never moves.
        const pin = item.currentCustomer
          ? item.currentCustomer.latitude !== null && item.currentCustomer.longitude !== null
            ? {
                id: item.id,
                lat: item.currentCustomer.latitude,
                lng: item.currentCustomer.longitude,
                label: item.currentCustomer.name,
                href: `/customers/${item.currentCustomer.id}`,
              }
            : null
          : {
              id: item.id,
              lat: branding.yardLatitude,
              lng: branding.yardLongitude,
              label: "Yard",
              href: `/equipment/${item.id}`,
            };

        return (
          pin && (
            <div className="mt-6">
              <LocationMap pins={[pin]} heightClassName="h-64" />
            </div>
          )
        );
      })()}

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

      <h2 className="mt-8 text-xl font-semibold text-ink">Condition Photos & Videos</h2>
      <MediaUploadForm
        uploadAction={uploadWithId}
        typeOptions={[
          { value: "condition", label: "Condition" },
          { value: "damage", label: "Damage" },
          { value: "repair", label: "Repair" },
          { value: "other", label: "Other" },
        ]}
        defaultType="condition"
        folder={`equipment/${item.id}`}
      />

      <MediaGrid items={item.photos} deleteAction={deleteEquipmentPhoto} />
    </div>
  );
}
