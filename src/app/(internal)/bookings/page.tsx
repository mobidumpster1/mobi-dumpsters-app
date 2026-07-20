import Link from "next/link";
import { db } from "@/lib/db";
import { computeBookingStatus } from "@/lib/bookingStatus";
import { AddressLink } from "@/components/AddressLink";
import { SearchBox } from "@/components/SearchBox";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "pending", label: "Pending Review" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function displayStatus(booking: {
  status: string;
  items: { deliveredAt: Date | null; actualReturnDate: Date | null }[];
}): { value: string; label: string } {
  if (booking.status === "pending") return { value: "pending", label: "Pending Review" };
  if (booking.status === "cancelled") return { value: "cancelled", label: "Cancelled" };
  const computed = computeBookingStatus(booking.items);
  return { value: computed.toLowerCase().replace(" ", "_"), label: computed };
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { status, q } = await searchParams;

  function statusHref(nextStatus?: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/bookings${qs ? `?${qs}` : ""}`;
  }

  const allBookings = await db.booking.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: { include: { equipmentItem: true } } },
  });

  const withStatus = allBookings.map((booking) => ({ ...booking, displayStatus: displayStatus(booking) }));

  const countByStatus = new Map<string, number>();
  for (const booking of withStatus) {
    countByStatus.set(booking.displayStatus.value, (countByStatus.get(booking.displayStatus.value) ?? 0) + 1);
  }

  const search = q?.trim().toLowerCase();
  const bookings = withStatus.filter((booking) => {
    if (status && booking.displayStatus.value !== status) return false;
    if (search) {
      const haystack = `${booking.customer.name} ${booking.deliveryAddress}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight text-ink">Bookings</h1>
        <Link
          href="/bookings/new"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          + New Booking
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={statusHref()}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !status ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          All ({withStatus.length})
        </Link>
        {STATUS_FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={statusHref(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              status === value ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label} ({countByStatus.get(value) ?? 0})
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <SearchBox placeholder="Search bookings by customer or address…" />
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="rounded-lg border-2 border-zinc-900 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/bookings/${booking.id}`}
                className="font-medium text-zinc-900 hover:underline"
              >
                {booking.customer.name}
              </Link>
              {booking.displayStatus.value === "pending" ? (
                <span className="inline-block flex-shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black text-white">
                  Pending Review
                </span>
              ) : booking.displayStatus.value === "cancelled" ? (
                <span className="inline-block flex-shrink-0 rounded-full bg-zinc-500 px-2 py-0.5 text-xs font-black text-white">
                  Cancelled
                </span>
              ) : (
                <span className="flex-shrink-0 text-xs text-zinc-500">{booking.displayStatus.label}</span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {booking.items.map((i) => i.equipmentItem.label).join(", ")}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              <AddressLink address={booking.deliveryAddress} />
            </p>
          </div>
        ))}
        {bookings.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            {allBookings.length === 0 ? "No bookings yet." : "No bookings match your search/filter."}
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white md:block">
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
                  {booking.displayStatus.value === "pending" ? (
                    <span className="inline-block rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black text-white">
                      Pending Review
                    </span>
                  ) : booking.displayStatus.value === "cancelled" ? (
                    <span className="inline-block rounded-full bg-zinc-500 px-2 py-0.5 text-xs font-black text-white">
                      Cancelled
                    </span>
                  ) : (
                    <span className="text-zinc-600">{booking.displayStatus.label}</span>
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  <AddressLink address={booking.deliveryAddress} />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  {allBookings.length === 0 ? "No bookings yet." : "No bookings match your search/filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
