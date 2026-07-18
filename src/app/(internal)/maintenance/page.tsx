import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MaintenanceEntryForm } from "@/components/MaintenanceEntryForm";
import { formatDate } from "@/lib/date";
import { utcStartOfToday } from "@/lib/documents";
import { MAINTENANCE_TYPE_LABELS, maintenanceUrgency } from "@/lib/maintenance";
import { deleteMaintenanceEntry } from "./actions";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const user = await requireUser();

  const [entries, vehicles, equipmentItems] = await Promise.all([
    db.maintenanceLogEntry.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { date: "desc" },
      include: { vehicle: true, equipmentItem: true },
    }),
    db.vehicle.findMany({
      where: { active: true, organizationId: user.effectiveOrganizationId },
      orderBy: { label: "asc" },
    }),
    db.equipmentItem.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { label: "asc" },
    }),
  ]);

  const today = utcStartOfToday();

  return (
    <div>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">Maintenance Log</h1>
        <p className="mt-1 text-zinc-500">
          Service history for trucks and equipment — with a heads-up on the Dispatch page as the
          next service date gets close.
        </p>
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {entries.map((entry) => {
          const u = entry.nextServiceDue ? maintenanceUrgency(entry.nextServiceDue, today) : null;
          return (
            <div key={entry.id} className="rounded-lg border-2 border-zinc-900 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-zinc-900">{entry.description}</div>
                  <div className="text-xs text-zinc-500">
                    {MAINTENANCE_TYPE_LABELS[entry.type] ?? entry.type} —{" "}
                    {entry.vehicle?.label ?? entry.equipmentItem?.label ?? "—"}
                  </div>
                </div>
                {u && <span className={`text-xs ${u.className}`}>{u.text}</span>}
              </div>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Date</dt>
                  <dd className="text-zinc-700">{formatDate(entry.date)}</dd>
                </div>
                {entry.cost != null && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Cost</dt>
                    <dd className="text-zinc-700">${entry.cost.toFixed(2)}</dd>
                  </div>
                )}
                {entry.vendor && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Vendor</dt>
                    <dd className="text-zinc-700">{entry.vendor}</dd>
                  </div>
                )}
                {entry.nextServiceDue && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Next Due</dt>
                    <dd className="text-zinc-700">{formatDate(entry.nextServiceDue)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-2 flex items-center gap-3">
                {entry.receiptUrl && (
                  <a
                    href={entry.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    View Receipt
                  </a>
                )}
                <form action={deleteMaintenanceEntry.bind(null, entry.id)}>
                  <ConfirmButton
                    message={`Delete this entry? This can't be undone.`}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No maintenance entries yet.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Description</th>
              <th className="px-5 py-3.5 font-semibold">Type</th>
              <th className="px-5 py-3.5 font-semibold">Vehicle / Equipment</th>
              <th className="px-5 py-3.5 font-semibold">Date</th>
              <th className="px-5 py-3.5 font-semibold">Cost</th>
              <th className="px-5 py-3.5 font-semibold">Next Due</th>
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entries.map((entry) => {
              const u = entry.nextServiceDue ? maintenanceUrgency(entry.nextServiceDue, today) : null;
              return (
                <tr key={entry.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <div className="font-medium text-zinc-900">{entry.description}</div>
                    {entry.vendor && <div className="text-xs text-zinc-500">{entry.vendor}</div>}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {MAINTENANCE_TYPE_LABELS[entry.type] ?? entry.type}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {entry.vehicle?.label ?? entry.equipmentItem?.label ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">{formatDate(entry.date)}</td>
                  <td className="px-5 py-4 text-zinc-600">
                    {entry.cost != null ? `$${entry.cost.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    {entry.nextServiceDue ? (
                      <>
                        <div className="text-zinc-700">{formatDate(entry.nextServiceDue)}</div>
                        {u && <div className={`text-xs ${u.className}`}>{u.text}</div>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {entry.receiptUrl && (
                        <a
                          href={entry.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          Receipt
                        </a>
                      )}
                      <form action={deleteMaintenanceEntry.bind(null, entry.id)}>
                        <ConfirmButton
                          message={`Delete this entry? This can't be undone.`}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  No maintenance entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-black text-ink">Add an Entry</h2>
      <div className="mt-3 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <MaintenanceEntryForm
          vehicles={vehicles.map((v) => ({ id: v.id, label: v.label }))}
          equipmentItems={equipmentItems.map((e) => ({ id: e.id, label: e.label }))}
        />
      </div>
    </div>
  );
}
