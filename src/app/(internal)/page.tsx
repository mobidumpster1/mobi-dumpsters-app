import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { markDelivered, markReturned } from "./bookings/actions";
import { LocationMap } from "@/components/LocationMap";

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
      <div className="flex items-center justify-between">
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
        <p className="mt-1 text-sm text-zinc-500">{address}</p>
      </div>
      <form action={action} className="mt-4">
        <button
          type="submit"
          className="text-sm font-semibold text-brand hover:underline"
        >
          {actionLabel}
        </button>
      </form>
    </div>
  );
}

export default async function DispatchPage() {
  const today = startOfToday();
  const weekEnd = daysFromNow(7);

  const [deliveries, pickups, activeBookings, pendingBookings] = await Promise.all([
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
  ]);

  const pins = activeBookings.map((b) => ({
    id: b.id,
    lat: b.latitude as number,
    lng: b.longitude as number,
    label: `${b.customer.name} — ${b.deliveryAddress}`,
    href: `/bookings/${b.id}`,
  }));

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
                  date={formatDate(item.startDate)}
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
                  date={formatDate(item.expectedReturnDate)}
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
