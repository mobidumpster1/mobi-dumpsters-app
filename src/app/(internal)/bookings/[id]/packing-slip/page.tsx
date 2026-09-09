import { existsSync } from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AddressLink } from "@/components/AddressLink";
import { PrintReportButton } from "@/components/PrintReportButton";
import { formatDateAndTime } from "@/lib/date";
import { branding } from "@/lib/branding";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// A printable pull sheet for one booking — what a driver/loader grabs
// before heading out, listing exactly what to load without needing the
// full booking screen. Deliberately separate from the booking detail page
// (which has a lot of staff-only controls) rather than just adding a print
// stylesheet to it.
export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const booking = await db.booking.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
    include: {
      customer: true,
      items: {
        include: { equipmentItem: { include: { category: true } } },
        orderBy: { startDate: "asc" },
      },
    },
  });
  if (!booking) notFound();

  const logoExists = existsSync(path.join(process.cwd(), "public", branding.logoPath));
  const undeliveredItems = booking.items.filter((item) => !item.deliveredAt);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/bookings/${booking.id}`}
          className="text-sm font-semibold text-brand hover:underline"
        >
          &larr; Back to Booking
        </Link>
        <PrintReportButton />
      </div>

      <div className="mt-4 rounded-lg border-2 border-zinc-900 bg-white p-6">
        <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
            {logoExists && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoPath}
                alt={branding.businessName}
                className="h-12 w-12 rounded-xl object-contain"
              />
            )}
            <div>
              <p className="font-semibold text-ink">{branding.businessName}</p>
              <p className="text-xs text-zinc-500">{branding.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black tracking-tight text-ink">Packing Slip</p>
            <p className="text-xs text-zinc-500">Booking #{booking.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-400">Customer</p>
            <p className="font-medium text-ink">{booking.customer.name}</p>
            {booking.customer.phone && <p className="text-zinc-600">{booking.customer.phone}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-400">Delivery Address</p>
            <p className="text-zinc-700">
              <AddressLink address={booking.deliveryAddress} />
            </p>
          </div>
        </div>

        {booking.permitRequired && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            &#9888; Permit required — {booking.permitStatus ?? "not yet requested"}
          </p>
        )}

        {booking.notes && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-zinc-400">Notes</p>
            <p className="text-sm text-zinc-700">{booking.notes}</p>
          </div>
        )}

        <p className="mt-6 text-xs font-semibold uppercase text-zinc-400">Items to Load</p>
        <div className="mt-2 overflow-x-auto rounded-lg border-2 border-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Item</th>
                <th className="px-4 py-2.5 font-semibold">Asset Tag</th>
                <th className="px-4 py-2.5 font-semibold">Category</th>
                <th className="px-4 py-2.5 font-semibold">Delivery Date</th>
                <th className="px-4 py-2.5 font-semibold print:hidden">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {booking.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {item.equipmentItem.label}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600">
                    {item.equipmentItem.assetTag ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{item.equipmentItem.category.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateAndTime(item.startDate)}</td>
                  <td className="px-4 py-3 text-zinc-600 print:hidden">
                    {item.deliveredAt ? "Delivered" : "Not yet delivered"}
                  </td>
                </tr>
              ))}
              {booking.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                    No items on this booking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {undeliveredItems.length === 0 && booking.items.length > 0 && (
          <p className="mt-3 text-xs text-zinc-400 print:hidden">
            Everything on this booking has already been delivered.
          </p>
        )}
      </div>
    </div>
  );
}
