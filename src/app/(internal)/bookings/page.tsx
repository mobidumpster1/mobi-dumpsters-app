import Link from "next/link";
import { db } from "@/lib/db";
import { computeBookingStatus } from "@/lib/bookingStatus";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const bookings = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: { include: { equipmentItem: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Bookings</h1>
        <Link
          href="/bookings/new"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          + New Booking
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">Items</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Delivery Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {booking.customer.name}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {booking.items.map((i) => i.equipmentItem.label).join(", ")}
                </td>
                <td className="px-5 py-4">
                  {booking.status === "pending" ? (
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Pending Review
                    </span>
                  ) : booking.status === "cancelled" ? (
                    <span className="inline-block rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      Cancelled
                    </span>
                  ) : (
                    <span className="text-zinc-600">
                      {computeBookingStatus(booking.items)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {booking.deliveryAddress}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
