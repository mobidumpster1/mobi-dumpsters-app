import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateAndTime } from "@/lib/date";
import { markDelivered, markReturned, resolveServiceRequest } from "./bookings/actions";
import { LocationMap } from "@/components/LocationMap";
import { AddressLink } from "@/components/AddressLink";
import { DirectionsButton } from "@/components/DirectionsButton";
import {
  DOCUMENT_EXPIRY_ALERT_DAYS,
  DOCUMENT_TYPE_LABELS,
  documentUrgency,
  utcStartOfToday,
} from "@/lib/documents";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(days: number) {
  const d = startOfToday();
  d.setDate(d.getDate() + days);
  return d;
}

function urgency(date: Date, today: Date) {
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, className: "text-red-600 font-semibold" };
  }
  if (diffDays === 0) return { text: "Today", className: "text-amber-600 font-semibold" };
  return { text: `In ${diffDays}d`, className: "text-zinc-500" };
}

function DispatchCard({
  date,
  urgencyText,
  urgencyClassName,
  itemLabel,
  itemHref,
  customerName,
  customerHref,
  address,
  actionLabel,
  action,
}: {
  date: string;
  urgencyText: string;
  urgencyClassName: string;
  itemLabel: string;
  itemHref: string;
  customerName: string;
  customerHref: string;
  address: string;
  actionLabel: string;
  action: (formData: FormData) => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-900">{date}</span>
        <span className={`text-xs ${urgencyClassName}`}>{urgencyText}</span>
      </div>
      <div className="mt-2">
        <Link
          href={customerHref}
          className="text-base font-semibold text-ink hover:underline"
        >
          {customerName}
        </Link>
        <p className="text-sm text-zinc-600">
          <Link href={itemHref} className="hover:underline">
            {itemLabel}
          </Link>
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          <AddressLink address={address} />
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <form action={action}>
          <button
            type="submit"
            className="text-sm font-semibold text-brand hover:underline"
          >
            {actionLabel}
          </button>
        </form>
        <DirectionsButton address={address} />
      </div>
    </div>
  );
}

export default async function DispatchPage() {
  const today = startOfToday();
  const weekEnd = daysFromNow(7);
  const docToday = utcStartOfToday();
  const docAlertCutoff = new Date(docToday);
  docAlertCutoff.setUTCDate(docAlertCutoff.getUTCDate() + DOCUMENT_EXPIRY_ALERT_DAYS);

  const [deliveries, pickups, activeBookings, pendingBookings, serviceRequests, expiringDocuments] =
    await Promise.all([
      db.bookingItem.findMany({
        where: {
          deliveredAt: null,
          startDate: { lte: weekEnd },
          booking: { status: "confirmed" },
        },
        include: { equipmentItem: true, booking: { include: { customer: true } } },
        orderBy: { startDate: "asc" },
      }),
      db.bookingItem.findMany({
        where: {
          actualReturnDate: null,
          expectedReturnDate: { lte: weekEnd },
          booking: { status: "confirmed" },
        },
        include: { equipmentItem: true, booking: { include: { customer: true } } },
        orderBy: { expectedReturnDate: "asc" },
      }),
      db.booking.findMany({
        where: {
          status: "confirmed",
          latitude: { not: null },
          longitude: { not: null },
          items: { some: { deliveredAt: { not: null }, actualReturnDate: null } },
        },
        include: { customer: true },
      }),
      db.booking.findMany({
        where: { status: "pending" },
        include: { customer: true, items: { include: { equipmentItem: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.serviceRequest.findMany({
        where: { status: "pending" },
        include: { booking: { include: { customer: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.document.findMany({
        where: { expiresOn: { lte: docAlertCutoff } },
        include: { vehicle: true },
        orderBy: { expiresOn: "asc" },
      }),
    ]);

  // Pin both equipment that's already out at a site and deliveries that are
  // scheduled but haven't happened yet, so the map is useful for planning
  // today's route, not just tracking what's already deployed.
  const pinsByBooking = new Map<
    string,
    { id: string; lat: number; lng: number; label: string; href: string }
  >();
  for (const b of activeBookings) {
    pinsByBooking.set(b.id, {
      id: b.id,
      lat: b.latitude as number,
      lng: b.longitude as number,
      label: `${b.customer.name} — ${b.deliveryAddress}`,
      href: `/bookings/${b.id}`,
    });
  }
  for (const item of deliveries) {
    const booking = item.booking;
    if (booking.latitude == null || booking.longitude == null) continue;
    if (pinsByBooking.has(booking.id)) continue;
    pinsByBooking.set(booking.id, {
      id: booking.id,
      lat: booking.latitude,
      lng: booking.longitude,
      label: `Scheduled: ${booking.customer.name} — ${booking.deliveryAddress}`,
      href: `/bookings/${booking.id}`,
    });
  }
  const pins = Array.from(pinsByBooking.values());

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Dispatch</h1>
        <p className="mt-1 text-zinc-500">
          What&apos;s due for delivery or pickup/return, today and this week.
        </p>
      </div>

      {pendingBookings.length > 0 && (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-ink">
            {pendingBookings.length} New Booking Request
            {pendingBookings.length === 1 ? "" : "s"} Awaiting Review
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {pendingBookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm hover:bg-amber-50/50"
              >
                <span className="font-medium text-zinc-900">
                  {booking.customer.name}
                </span>
                <span className="text-sm text-zinc-500">
                  {booking.items.map((item) => item.equipmentItem.label).join(", ")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {serviceRequests.length > 0 && (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-ink">
            {serviceRequests.length} Service Request
            {serviceRequests.length === 1 ? "" : "s"}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {serviceRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <Link
                    href={`/bookings/${req.bookingId}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {req.booking.customer.name}
                  </Link>
                  <p className="text-sm text-zinc-500">
                    {req.type === "extension" ? "Wants more time" : "Wants dump & return"}
                    {req.details ? ` — ${req.details}` : ""}
                  </p>
                </div>
                <form action={resolveServiceRequest.bind(null, req.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Mark Handled
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {expiringDocuments.length > 0 && (
        <section className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-ink">
            {expiringDocuments.length} Document{expiringDocuments.length === 1 ? "" : "s"} Expiring
            Soon
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {expiringDocuments.map((doc) => {
              const u = documentUrgency(doc.expiresOn, docToday);
              return (
                <Link
                  key={doc.id}
                  href="/documents"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 shadow-sm hover:bg-red-50/50"
                >
                  <div>
                    <span className="font-medium text-zinc-900">{doc.name}</span>
                    <span className="ml-2 text-sm text-zinc-500">
                      {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                      {doc.vehicle ? ` — ${doc.vehicle.label}` : ""}
                    </span>
                  </div>
                  <span className={`text-sm ${u.className}`}>{u.text}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold text-ink">Active Equipment Map</h2>
        <div className="mt-3">
          <LocationMap pins={pins} heightClassName="h-96" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold text-ink">Deliveries</h2>
          <div className="mt-3 flex flex-col gap-3">
            {deliveries.map((item) => {
              const u = urgency(item.startDate, today);
              return (
                <DispatchCard
                  key={item.id}
                  date={formatDateAndTime(item.startDate)}
                  urgencyText={u.text}
                  urgencyClassName={u.className}
                  itemLabel={item.equipmentItem.label}
                  itemHref={`/equipment/${item.equipmentItem.id}`}
                  customerName={item.booking.customer.name}
                  customerHref={`/bookings/${item.booking.id}`}
                  address={item.booking.deliveryAddress}
                  actionLabel="Mark Delivered"
                  action={markDelivered.bind(null, item.id)}
                />
              );
            })}
            {deliveries.length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-400">
                Nothing due for delivery.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Pickups &amp; Returns</h2>
          <div className="mt-3 flex flex-col gap-3">
            {pickups.map((item) => {
              const u = urgency(item.expectedReturnDate, today);
              return (
                <DispatchCard
                  key={item.id}
                  date={formatDateAndTime(item.expectedReturnDate)}
                  urgencyText={u.text}
                  urgencyClassName={u.className}
                  itemLabel={item.equipmentItem.label}
                  itemHref={`/equipment/${item.equipmentItem.id}`}
                  customerName={item.booking.customer.name}
                  customerHref={`/bookings/${item.booking.id}`}
                  address={item.booking.deliveryAddress}
                  actionLabel="Mark Returned"
                  action={markReturned.bind(null, item.id)}
                />
              );
            })}
            {pickups.length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-400">
                Nothing due for pickup.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
