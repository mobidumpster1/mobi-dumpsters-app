import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDateAndTime } from "@/lib/date";
import { AddressLink } from "@/components/AddressLink";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { Field, inputClass } from "@/components/Field";
import { markDelivered, markReturned } from "@/app/(internal)/bookings/actions";
import { uploadPhoto } from "@/app/(internal)/bookings/photoActions";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export default async function DriverPage() {
  const user = await requireUser();
  const todayEnd = startOfTomorrow();

  // Unassigned jobs show up for everyone — a solo owner-operator never has
  // to self-assign every booking just to see it here.
  const driverScope = { OR: [{ driverId: user.id }, { driverId: null }] };

  const [deliveries, pickups] = await Promise.all([
    db.bookingItem.findMany({
      where: {
        deliveredAt: null,
        startDate: { lt: todayEnd },
        booking: {
          status: "confirmed",
          organizationId: user.effectiveOrganizationId,
          ...driverScope,
        },
      },
      include: { equipmentItem: { include: { category: true } }, booking: { include: { customer: true } } },
      orderBy: { startDate: "asc" },
    }),
    db.bookingItem.findMany({
      where: {
        actualReturnDate: null,
        expectedReturnDate: { lt: todayEnd },
        booking: {
          status: "confirmed",
          organizationId: user.effectiveOrganizationId,
          ...driverScope,
        },
      },
      include: { equipmentItem: { include: { category: true } }, booking: { include: { customer: true } } },
      orderBy: { expectedReturnDate: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-ink">My Jobs</h1>
      <p className="mt-1 text-sm text-zinc-500">Today&apos;s deliveries and pickups.</p>

      <section className="mt-6">
        <h2 className="text-lg font-black text-ink">Deliveries</h2>
        <div className="mt-3 flex flex-col gap-3">
          {deliveries.map((item) => (
            <div key={item.id} className="rounded-lg border-2 border-zinc-900 bg-white p-4">
              {item.equipmentItem.assetTag && (
                <span className="mb-1 inline-block rounded-full bg-brand px-3 py-1 font-mono text-sm font-bold text-white">
                  {item.equipmentItem.assetTag}
                </span>
              )}
              <p className="text-xs font-semibold text-amber-600">{formatDateAndTime(item.startDate)}</p>
              <p className="mt-1 font-bold text-ink">{item.booking.customer.name}</p>
              <p className="text-sm text-zinc-600">
                <AddressLink address={item.booking.deliveryAddress} />
              </p>
              <p className="mt-1 text-sm text-zinc-700">
                {item.equipmentItem.label} ({item.equipmentItem.category.name})
              </p>
              {item.booking.notes && (
                <p className="mt-1 text-xs text-zinc-500">Note: {item.booking.notes}</p>
              )}
              {item.booking.permitRequired && (
                <p className="mt-1 text-xs font-semibold text-amber-600">
                  ⚠ Permit required — {item.booking.permitStatus ?? "not yet requested"}
                </p>
              )}

              <form action={markDelivered.bind(null, item.id)} className="mt-3">
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  Mark Delivered
                </button>
              </form>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-zinc-500">
                  Add delivery photo
                </summary>
                <div className="mt-2">
                  <MediaUploadForm
                    uploadAction={uploadPhoto.bind(null, item.booking.id)}
                    typeOptions={[{ value: "delivery", label: "Delivery" }]}
                    defaultType="delivery"
                    folder={`bookings/${item.booking.id}`}
                  />
                </div>
              </details>
            </div>
          ))}
          {deliveries.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-400">
              Nothing due for delivery.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-black text-ink">Pickups &amp; Returns</h2>
        <div className="mt-3 flex flex-col gap-3">
          {pickups.map((item) => (
            <div key={item.id} className="rounded-lg border-2 border-zinc-900 bg-white p-4">
              {item.equipmentItem.assetTag && (
                <span className="mb-1 inline-block rounded-full bg-brand px-3 py-1 font-mono text-sm font-bold text-white">
                  {item.equipmentItem.assetTag}
                </span>
              )}
              <p className="text-xs font-semibold text-amber-600">
                {formatDateAndTime(item.expectedReturnDate)}
              </p>
              <p className="mt-1 font-bold text-ink">{item.booking.customer.name}</p>
              <p className="text-sm text-zinc-600">
                <AddressLink address={item.booking.deliveryAddress} />
              </p>
              <p className="mt-1 text-sm text-zinc-700">
                {item.equipmentItem.label} ({item.equipmentItem.category.name})
              </p>
              {item.booking.notes && (
                <p className="mt-1 text-xs text-zinc-500">Note: {item.booking.notes}</p>
              )}

              <form action={markReturned.bind(null, item.id)} className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Field label="Tons (optional)" htmlFor={`tons-${item.id}`}>
                    <input
                      id={`tons-${item.id}`}
                      type="number"
                      step="0.01"
                      name="actualTonnage"
                      className={`${inputClass} w-28 px-2.5 py-1.5 text-sm`}
                    />
                  </Field>
                  <Field label="Miles (optional)" htmlFor={`miles-${item.id}`}>
                    <input
                      id={`miles-${item.id}`}
                      type="number"
                      step="0.1"
                      name="actualMileage"
                      className={`${inputClass} w-28 px-2.5 py-1.5 text-sm`}
                    />
                  </Field>
                </div>
                <button
                  type="submit"
                  className="self-start rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  Mark Picked Up
                </button>
              </form>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-zinc-500">
                  Add pickup photo
                </summary>
                <div className="mt-2">
                  <MediaUploadForm
                    uploadAction={uploadPhoto.bind(null, item.booking.id)}
                    typeOptions={[{ value: "pickup", label: "Pickup" }]}
                    defaultType="pickup"
                    folder={`bookings/${item.booking.id}`}
                  />
                </div>
              </details>
            </div>
          ))}
          {pickups.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-400">
              Nothing due for pickup.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
