import Link from "next/link";
import { Badge, EmptyState, PageHeader, bookingTone, buttonClass } from "@/components/ui";
import { db } from "@/lib/db";
import { computeBookingStatus, bookingStatusFilter } from "@/lib/bookingStatus";
import { AddressLink } from "@/components/AddressLink";
import { SearchBox } from "@/components/SearchBox";
import { Pagination } from "@/components/Pagination";
import { requireUser, hasPermission } from "@/lib/session";
import { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "pending", label: "Pending Review" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const PAGE_SIZE = 50;

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
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { status, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Math.trunc(Number(pageParam)) || 1);

  function statusHref(nextStatus?: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/bookings${qs ? `?${qs}` : ""}`;
  }

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/bookings${qs ? `?${qs}` : ""}`;
  }

  const orgWhere: Prisma.BookingWhereInput = { organizationId: user.effectiveOrganizationId };
  const search = q?.trim();
  const searchWhere: Prisma.BookingWhereInput = search
    ? {
        OR: [
          { customer: { name: { contains: search, mode: "insensitive" } } },
          { deliveryAddress: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  const where: Prisma.BookingWhereInput = {
    AND: [orgWhere, status ? bookingStatusFilter(status) : {}, searchWhere],
  };

  const [
    bookingsRaw,
    matchingCount,
    allCount,
    pendingCount,
    scheduledCount,
    inProgressCount,
    completedCount,
    cancelledCount,
  ] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: { include: { equipmentItem: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.booking.count({ where }),
    db.booking.count({ where: orgWhere }),
    db.booking.count({ where: { ...orgWhere, ...bookingStatusFilter("pending") } }),
    db.booking.count({ where: { AND: [orgWhere, bookingStatusFilter("scheduled")] } }),
    db.booking.count({ where: { AND: [orgWhere, bookingStatusFilter("in_progress")] } }),
    db.booking.count({ where: { AND: [orgWhere, bookingStatusFilter("completed")] } }),
    db.booking.count({ where: { ...orgWhere, ...bookingStatusFilter("cancelled") } }),
  ]);

  const countByStatus = new Map<string, number>([
    ["pending", pendingCount],
    ["scheduled", scheduledCount],
    ["in_progress", inProgressCount],
    ["completed", completedCount],
    ["cancelled", cancelledCount],
  ]);

  const bookings = bookingsRaw.map((booking) => ({ ...booking, displayStatus: displayStatus(booking) }));
  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Every rental request and job, from first request to pickup."
        actions={
          <>
            {hasPermission(user, "canViewReports") && (
              <a href="/api/bookings/export" className={buttonClass("secondary")}>
                Export CSV
              </a>
            )}
            <Link href="/bookings/new" className={buttonClass("primary")}>
              + New Booking
            </Link>
          </>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={statusHref()}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !status ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          All ({allCount})
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
              <Badge tone={bookingTone(booking.displayStatus.value)}>{booking.displayStatus.label}</Badge>
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
          <EmptyState>
            {allCount === 0 ? "No bookings yet — create your first one above." : "No bookings match your search/filter."}
          </EmptyState>
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
                  <Badge tone={bookingTone(booking.displayStatus.value)}>{booking.displayStatus.label}</Badge>
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  <AddressLink address={booking.deliveryAddress} />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  {allCount === 0 ? "No bookings yet — create your first one above." : "No bookings match your search/filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} buildHref={pageHref} />
    </div>
  );
}
