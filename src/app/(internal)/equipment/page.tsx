import Link from "next/link";
import { db } from "@/lib/db";
import { StatusQuickSelect } from "@/components/StatusQuickSelect";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/equipmentStatus";
import { quickSetEquipmentStatus } from "./actions";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 86_400_000;

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const [items, statusCounts, totalCount] = await Promise.all([
    db.equipmentItem.findMany({
      where: status ? { status } : undefined,
      orderBy: { label: "asc" },
      include: {
        category: true,
        currentCustomer: true,
        locationEvents: {
          where: { endedAt: null },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    }),
    db.equipmentItem.groupBy({ by: ["status"], _count: true }),
    db.equipmentItem.count(),
  ]);

  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Equipment</h1>
        <div className="flex gap-3">
          <Link
            href="/equipment/categories"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Manage Categories
          </Link>
          <Link
            href="/equipment/new"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            + New Equipment
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/equipment"
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
            href={`/equipment?status=${value}`}
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

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
                    <Link
                      href={`/equipment/${item.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {item.label}
                    </Link>
                    {item.assetTag && (
                      <div className="text-xs text-zinc-500">{item.assetTag}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">{item.category.name}</td>
                  <td className="px-5 py-4">
                    <StatusQuickSelect
                      itemId={item.id}
                      currentStatus={item.status}
                      action={quickSetEquipmentStatus}
                    />
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
                  No equipment yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
