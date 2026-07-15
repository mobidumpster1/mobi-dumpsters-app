import Link from "next/link";
import { db } from "@/lib/db";
import { StatusQuickSelect } from "@/components/StatusQuickSelect";
import { SearchBox } from "@/components/SearchBox";
import { EquipmentTabs } from "@/components/EquipmentTabs";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/equipmentStatus";
import { quickSetEquipmentStatus } from "./actions";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 86_400_000;

export default async function EquipmentPage({
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
    return `/equipment${qs ? `?${qs}` : ""}`;
  }

  const [items, statusCounts, totalCount] = await Promise.all([
    db.equipmentItem.findMany({
      where: {
        organizationId: user.effectiveOrganizationId,
        status: status || undefined,
        ...(q
          ? {
              OR: [
                { label: { contains: q, mode: "insensitive" } },
                { assetTag: { contains: q, mode: "insensitive" } },
                { category: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { label: "asc" },
      include: {
        category: true,
        currentCustomer: true,
        locationEvents: {
          where: { endedAt: null },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
        // Status flips to "reserved" the moment a booking is created, even
        // if delivery is a week out — this is the nearest not-yet-started
        // booking, used to show "available until [date]" instead of a flat
        // "Reserved" badge that reads as unavailable starting today.
        bookingItems: {
          where: { actualReturnDate: null, startDate: { gt: new Date() } },
          orderBy: { startDate: "asc" },
          take: 1,
        },
      },
    }),
    db.equipmentItem.groupBy({
      by: ["status"],
      where: { organizationId: user.effectiveOrganizationId },
      _count: true,
    }),
    db.equipmentItem.count({ where: { organizationId: user.effectiveOrganizationId } }),
  ]);

  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight text-ink">Equipment</h1>
        <Link
          href="/equipment/new"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          + New Equipment
        </Link>
      </div>

      <div className="mt-4">
        <EquipmentTabs />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={statusHref()}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !status
              ? "bg-brand text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          All ({totalCount})
        </Link>
        {Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={statusHref(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              status === value
                ? "bg-brand text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label} ({countByStatus.get(value) ?? 0})
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <SearchBox placeholder="Search equipment by name, asset tag, or category…" />
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {items.map((item) => {
          const openEvent = item.locationEvents[0];
          const daysAtSite = openEvent
            ? Math.floor((new Date().getTime() - openEvent.startedAt.getTime()) / MS_PER_DAY)
            : null;
          const isAging =
            openEvent !== undefined &&
            openEvent?.location !== "Yard" &&
            daysAtSite !== null &&
            daysAtSite > item.category.agingThresholdDays;

          return (
            <div
              key={item.id}
              className="rounded-lg border-2 border-zinc-900 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  {item.category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.category.imageUrl}
                      alt={item.category.name}
                      className="h-12 w-12 flex-shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 flex-shrink-0 rounded-lg border border-dashed border-zinc-300 bg-zinc-50" />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/equipment/${item.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {item.label}
                    </Link>
                    {item.assetTag && (
                      <div className="text-xs text-zinc-500">{item.assetTag}</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <StatusQuickSelect
                    itemId={item.id}
                    currentStatus={item.status}
                    action={quickSetEquipmentStatus}
                  />
                  {item.status === "reserved" && item.bookingItems[0] && (
                    <span className="text-xs text-zinc-400">
                      Available until {item.bookingItems[0].startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Category</dt>
                  <dd className="text-zinc-700">{item.category.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Location / Customer</dt>
                  <dd className="truncate text-zinc-700">
                    {item.currentCustomer
                      ? item.currentCustomer.name
                      : (item.currentLocation ?? "Yard")}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">At Site</dt>
                  <dd>
                    {daysAtSite !== null && openEvent?.location !== "Yard" ? (
                      <span
                        className={
                          isAging
                            ? "font-semibold text-red-600"
                            : "text-zinc-500"
                        }
                      >
                        {daysAtSite}d{isAging ? " — sitting too long" : ""}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            {q || status ? "No equipment matches your filters." : "No equipment yet."}
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Item</th>
              <th className="px-5 py-3.5 font-semibold">Category</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Location / Customer</th>
              <th className="px-5 py-3.5 font-semibold">At Site</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((item) => {
              const openEvent = item.locationEvents[0];
              const daysAtSite = openEvent
                ? Math.floor((new Date().getTime() - openEvent.startedAt.getTime()) / MS_PER_DAY)
                : null;
              const isAging =
                openEvent !== undefined &&
                openEvent?.location !== "Yard" &&
                daysAtSite !== null &&
                daysAtSite > item.category.agingThresholdDays;

              return (
                <tr key={item.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {item.category.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.category.imageUrl}
                          alt={item.category.name}
                          className="h-12 w-12 flex-shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 object-contain"
                        />
                      ) : (
                        <div className="h-12 w-12 flex-shrink-0 rounded-lg border border-dashed border-zinc-300 bg-zinc-50" />
                      )}
                      <div>
                        <Link
                          href={`/equipment/${item.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {item.label}
                        </Link>
                        {item.assetTag && (
                          <div className="text-xs text-zinc-500">{item.assetTag}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-zinc-600">{item.category.name}</td>
                  <td className="px-5 py-4">
                    <StatusQuickSelect
                      itemId={item.id}
                      currentStatus={item.status}
                      action={quickSetEquipmentStatus}
                    />
                    {item.status === "reserved" && item.bookingItems[0] && (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Available until {item.bookingItems[0].startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {item.currentCustomer
                      ? item.currentCustomer.name
                      : (item.currentLocation ?? "Yard")}
                  </td>
                  <td className="px-5 py-4">
                    {daysAtSite !== null && openEvent?.location !== "Yard" ? (
                      <span
                        className={
                          isAging
                            ? "font-semibold text-red-600"
                            : "text-zinc-500"
                        }
                      >
                        {daysAtSite}d{isAging ? " — sitting too long" : ""}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  {q || status ? "No equipment matches your filters." : "No equipment yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
