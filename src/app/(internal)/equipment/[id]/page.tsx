import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { StatusQuickSelect } from "@/components/StatusQuickSelect";
import { formatAttributeValue, parseAttributes, parseFieldDefinitions } from "@/lib/categoryFields";
import { uploadEquipmentPhoto, deleteEquipmentPhoto } from "../photoActions";
import { quickSetEquipmentStatus, scheduleMaintenanceWindow, cancelMaintenanceWindow } from "../actions";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { MediaGrid } from "@/components/MediaGrid";
import { LocationMap } from "@/components/LocationMap";
import { Avatar } from "@/components/Avatar";
import { Field, inputClass } from "@/components/Field";
import { branding } from "@/lib/branding";
import { requireUser } from "@/lib/session";
import { equipmentScanUrl, equipmentQrCodeDataUrl } from "@/lib/equipmentQrCode";

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
  const user = await requireUser();
  const item = await db.equipmentItem.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
    include: {
      category: true,
      currentCustomer: true,
      homeLocation: true,
      locationEvents: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { customer: true, movedByUser: { select: { id: true, name: true, avatarUrl: true } } },
      },
      photos: { orderBy: { createdAt: "desc" } },
      // Status flips to "reserved" the moment a booking is created, even
      // if delivery is a week out — this is the nearest not-yet-started
      // booking, used to show "available until [date]" instead of a flat
      // "Reserved" badge that reads as unavailable starting today.
      bookingItems: {
        where: { actualReturnDate: null, startDate: { gt: new Date() } },
        orderBy: { startDate: "asc" },
        take: 1,
      },
      maintenanceWindows: {
        where: { endDate: { gt: new Date() } },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!item) notFound();

  const fieldDefs = parseFieldDefinitions(item.category.fieldDefinitions);
  const attributes = parseAttributes(item.attributes);
  const uploadWithId = uploadEquipmentPhoto.bind(null, item.id);

  const host = (await headers()).get("host");
  const scanUrl = host ? equipmentScanUrl(`https://${host}`, item.id) : null;
  const qrCodeDataUrl = scanUrl ? await equipmentQrCodeDataUrl(scanUrl) : null;

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
          <h1 className="text-3xl font-black tracking-tight text-ink">
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

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Status</dt>
          <dd className="mt-1">
            <StatusQuickSelect
              itemId={item.id}
              currentStatus={item.status}
              action={quickSetEquipmentStatus}
            />
            {item.status === "reserved" && item.bookingItems[0] && (
              <p className="mt-1 text-xs text-zinc-400">
                Available until {formatDateTime(item.bookingItems[0].startDate)}
              </p>
            )}
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
        {item.homeLocation && (
          <div>
            <dt className="text-zinc-500">Home Location</dt>
            <dd className="text-zinc-900">{item.homeLocation.name}</dd>
          </div>
        )}
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

      {qrCodeDataUrl && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL, not a static asset next/image can optimize */}
          <img
            src={qrCodeDataUrl}
            alt={`QR code for ${item.label}`}
            width={120}
            height={120}
            className="rounded-lg border border-zinc-200"
          />
          <div>
            <p className="font-medium text-zinc-900">Scan to deliver/return</p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Print this on the unit&apos;s label. Scanning it with a phone
              camera (or the in-app scanner on Driver/Equipment) opens
              this item&apos;s next action directly — no need to search for
              it in a list.
            </p>
          </div>
        </div>
      )}

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

      <h2 className="mt-8 text-xl font-black text-ink">Scheduled Maintenance</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Block out a future date range for planned work — the item won&apos;t
        show as available to book, or be draggable in the calendar, during
        that window. This doesn&apos;t change the item&apos;s current
        status; flip that separately once it&apos;s actually pulled for
        repair.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {item.maintenanceWindows.map((window) => (
          <div
            key={window.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-zinc-900 bg-white p-4"
          >
            <div>
              <p className="font-medium text-zinc-900">
                {formatDateTime(window.startDate)} &ndash; {formatDateTime(new Date(window.endDate.getTime() - MS_PER_DAY))}
              </p>
              {window.reason && (
                <p className="text-sm text-zinc-500">{window.reason}</p>
              )}
            </div>
            <form action={cancelMaintenanceWindow.bind(null, window.id)}>
              <button
                type="submit"
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Cancel
              </button>
            </form>
          </div>
        ))}
        {item.maintenanceWindows.length === 0 && (
          <p className="text-zinc-400">No upcoming maintenance scheduled.</p>
        )}
        <details className="rounded-lg border border-dashed border-zinc-300 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand">
            + Schedule maintenance
          </summary>
          <form
            action={scheduleMaintenanceWindow.bind(null, item.id)}
            className="mt-3 flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Start" htmlFor="startDate">
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="End" htmlFor="endDate">
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Reason (optional)" htmlFor="reason">
              <input
                id="reason"
                name="reason"
                placeholder="e.g. Gate repair, new axle"
                className={inputClass}
              />
            </Field>
            <button
              type="submit"
              className="self-start rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
            >
              Schedule
            </button>
          </form>
        </details>
      </div>

      <h2 className="mt-8 text-xl font-black text-ink">Location History</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Location</th>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">By</th>
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
                  {event.movedByUser ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        userId={event.movedByUser.id}
                        name={event.movedByUser.name}
                        avatarUrl={event.movedByUser.avatarUrl}
                        size={22}
                      />
                      {event.movedByUser.name}
                    </div>
                  ) : (
                    "—"
                  )}
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
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">
                  No location history yet — this starts once the item is
                  marked delivered on a booking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-black text-ink">Condition Photos & Videos</h2>
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
