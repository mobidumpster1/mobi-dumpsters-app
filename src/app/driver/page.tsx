import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDateAndTime } from "@/lib/date";
import { AddressLink } from "@/components/AddressLink";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { Field, inputClass } from "@/components/Field";
import { markDelivered, markReturned } from "@/app/(internal)/bookings/actions";
import { logBookingWeight } from "@/app/(internal)/bookings/quickActions";
import { uploadPhoto } from "@/app/(internal)/bookings/photoActions";
import { ScanButton } from "@/components/ScanButton";
import { LogWeightForm } from "@/components/QuickBookingForms";
import { EmptyState, buttonClass } from "@/components/ui";

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

// One tap to call or text the customer from the truck.
function ContactButtons({ phone }: { phone: string | null }) {
  const digits = phone?.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;
  return (
    <div className="mt-3 flex gap-2">
      <a href={`tel:${digits}`} className={`${buttonClass("secondary")} flex-1`}>
        Call
      </a>
      <a href={`sms:${digits}`} className={`${buttonClass("secondary")} flex-1`}>
        Text
      </a>
    </div>
  );
}

const CARD = "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm";

export default async function DriverPage() {
  const user = await requireUser();
  const todayEnd = startOfTomorrow();
  const twoWeeksAgo = startOfToday();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Unassigned jobs show up for everyone — a solo owner-operator never has
  // to self-assign every booking just to see it here.
  const driverScope = { OR: [{ driverId: user.id }, { driverId: null }] };

  const [deliveries, pickups, awaitingWeight] = await Promise.all([
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
    // Loads picked up but not yet weighed — the scale ticket only exists
    // once the load has been dumped, so this is where the driver enters it.
    db.bookingItem.findMany({
      where: {
        actualReturnDate: { not: null, gte: twoWeeksAgo },
        actualTonnage: null,
        equipmentItem: { category: { includedTonnage: { not: null } } },
        booking: {
          status: { notIn: ["cancelled", "pending"] },
          organizationId: user.effectiveOrganizationId,
          ...driverScope,
        },
      },
      include: { equipmentItem: { include: { category: true } }, booking: { include: { customer: true } } },
      orderBy: { actualReturnDate: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight text-ink">My Jobs</h1>
          <p className="mt-1 text-sm text-zinc-500">Today&apos;s deliveries and pickups.</p>
        </div>
        <ScanButton />
      </div>

      <section className="mt-6">
        <h2 className="text-xl text-ink">Deliveries</h2>
        <div className="mt-3 flex flex-col gap-3">
          {deliveries.map((item) => (
            <div key={item.id} className={CARD}>
              {item.equipmentItem.assetTag && (
                <span className="mb-1 inline-block rounded-full bg-brand px-3 py-1 font-mono text-sm font-bold text-on-brand">
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

              <ContactButtons phone={item.booking.customer.phone} />

              <form action={markDelivered.bind(null, item.id)} className="mt-3">
                <button type="submit" className={`${buttonClass("primary")} min-h-12 w-full text-base`}>
                  Mark Delivered
                </button>
              </form>

              <details className="mt-3">
                <summary className="cursor-pointer py-1 text-sm font-semibold text-zinc-600">
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
          {deliveries.length === 0 && <EmptyState>Nothing due for delivery.</EmptyState>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl text-ink">Pickups &amp; Returns</h2>
        <div className="mt-3 flex flex-col gap-3">
          {pickups.map((item) => (
            <div key={item.id} className={CARD}>
              {item.equipmentItem.assetTag && (
                <span className="mb-1 inline-block rounded-full bg-brand px-3 py-1 font-mono text-sm font-bold text-on-brand">
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

              <ContactButtons phone={item.booking.customer.phone} />

              <form action={markReturned.bind(null, item.id)} className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Field label="Tons (optional)" htmlFor={`tons-${item.id}`}>
                    <input
                      id={`tons-${item.id}`}
                      type="number"
                      step="0.01"
                      name="actualTonnage"
                      inputMode="decimal"
                      className={`${inputClass} w-28 px-2.5 py-1.5 text-sm`}
                    />
                  </Field>
                  <Field label="Miles (optional)" htmlFor={`miles-${item.id}`}>
                    <input
                      id={`miles-${item.id}`}
                      type="number"
                      step="0.1"
                      name="actualMileage"
                      inputMode="decimal"
                      className={`${inputClass} w-28 px-2.5 py-1.5 text-sm`}
                    />
                  </Field>
                </div>
                <button type="submit" className={`${buttonClass("primary")} min-h-12 w-full text-base`}>
                  Mark Picked Up
                </button>
              </form>

              <details className="mt-3">
                <summary className="cursor-pointer py-1 text-sm font-semibold text-zinc-600">
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
          {pickups.length === 0 && <EmptyState>Nothing due for pickup.</EmptyState>}
        </div>
      </section>

      {awaitingWeight.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl text-ink">Waiting on the Scale Ticket</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Picked up, dump weight not entered yet. Enter it from the scale ticket.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {awaitingWeight.map((item) => (
              <div key={item.id} className={CARD}>
                <p className="font-bold text-ink">{item.booking.customer.name}</p>
                <p className="text-sm text-zinc-600">
                  {item.equipmentItem.label} ({item.equipmentItem.category.name})
                </p>
                <div className="mt-3">
                  <LogWeightForm
                    action={logBookingWeight.bind(null, item.booking.id)}
                    items={[{ id: item.id, label: item.equipmentItem.label }]}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
