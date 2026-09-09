import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatEquipmentStatus } from "@/lib/equipmentStatus";
import { formatDateAndTime } from "@/lib/date";
import { AddressLink } from "@/components/AddressLink";
import { Field, inputClass } from "@/components/Field";
import { markDelivered, markReturned } from "@/app/(internal)/bookings/actions";

export const dynamic = "force-dynamic";

// Landing page for a scanned equipment QR code — same idea as /driver's
// job cards, but reached by scanning the physical unit instead of picking
// it out of a list. Shows whatever action is actually next for this item
// (deliver or return) rather than a generic detail page.
export default async function ScanLandingPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const user = await requireUser();
  const item = await db.equipmentItem.findFirst({
    where: { id: itemId, organizationId: user.effectiveOrganizationId },
    include: {
      category: true,
      bookingItems: {
        where: { actualReturnDate: null },
        orderBy: { startDate: "asc" },
        take: 1,
        include: { booking: { include: { customer: true } } },
      },
    },
  });
  if (!item) notFound();

  const activeBookingItem = item.bookingItems[0];

  return (
    <div>
      {item.assetTag && (
        <span className="mb-2 inline-block rounded-full bg-brand px-3 py-1 font-mono text-sm font-bold text-white">
          {item.assetTag}
        </span>
      )}
      <h1 className="text-2xl font-black tracking-tight text-ink">{item.label}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {item.category.name} &middot; {formatEquipmentStatus(item.status)}
      </p>

      {!activeBookingItem && (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-400">
          No active booking for this item right now.
        </p>
      )}

      {activeBookingItem && !activeBookingItem.deliveredAt && (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-4">
          <p className="text-xs font-semibold text-amber-600">
            {formatDateAndTime(activeBookingItem.startDate)}
          </p>
          <p className="mt-1 font-bold text-ink">{activeBookingItem.booking.customer.name}</p>
          <p className="text-sm text-zinc-600">
            <AddressLink address={activeBookingItem.booking.deliveryAddress} />
          </p>
          <form action={markDelivered.bind(null, activeBookingItem.id)} className="mt-3">
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
            >
              Mark Delivered
            </button>
          </form>
        </div>
      )}

      {activeBookingItem && activeBookingItem.deliveredAt && (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-4">
          <p className="text-xs font-semibold text-amber-600">
            {formatDateAndTime(activeBookingItem.expectedReturnDate)}
          </p>
          <p className="mt-1 font-bold text-ink">{activeBookingItem.booking.customer.name}</p>
          <p className="text-sm text-zinc-600">
            <AddressLink address={activeBookingItem.booking.deliveryAddress} />
          </p>
          <form
            action={markReturned.bind(null, activeBookingItem.id)}
            className="mt-3 flex flex-col gap-2"
          >
            <div className="flex flex-wrap gap-2">
              <Field label="Tons (optional)" htmlFor="actualTonnage">
                <input
                  id="actualTonnage"
                  type="number"
                  step="0.01"
                  name="actualTonnage"
                  className={`${inputClass} w-28 px-2.5 py-1.5 text-sm`}
                />
              </Field>
              <Field label="Miles (optional)" htmlFor="actualMileage">
                <input
                  id="actualMileage"
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
        </div>
      )}

      {!user.isDriverOnly && (
        <Link
          href={`/equipment/${item.id}`}
          className="mt-6 inline-block text-sm font-semibold text-brand hover:underline"
        >
          View full equipment record &rarr;
        </Link>
      )}
    </div>
  );
}
