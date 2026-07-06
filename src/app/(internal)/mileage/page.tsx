import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { Field, inputClass } from "@/components/Field";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  addMileageEntry,
  deleteMileageEntry,
  addVehicle,
  toggleVehicleActive,
} from "./actions";

export const dynamic = "force-dynamic";

function startOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfYear() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function MilesCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="truncate text-sm text-zinc-500">{label}</div>
      <div className="mt-1 break-words text-xl font-semibold text-zinc-900 sm:text-2xl">
        {value.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi
      </div>
    </div>
  );
}

export default async function MileagePage() {
  const [entries, equipmentItems, vehicles] = await Promise.all([
    db.mileageLogEntry.findMany({
      orderBy: { date: "desc" },
      include: {
        equipmentItem: true,
        vehicle: true,
        booking: { include: { customer: true } },
      },
    }),
    db.equipmentItem.findMany({
      where: { status: { not: "retired" } },
      orderBy: { label: "asc" },
      include: { category: true },
    }),
    db.vehicle.findMany({ orderBy: { label: "asc" } }),
  ]);

  const activeVehicles = vehicles.filter((v) => v.active);

  function entryLabel(entry: (typeof entries)[number]) {
    return entry.vehicle?.label ?? entry.equipmentItem?.label ?? "—";
  }

  const monthStart = startOfMonth();
  const yearStart = startOfYear();
  const totalAllTime = entries.reduce((sum, e) => sum + e.miles, 0);
  const totalThisMonth = entries
    .filter((e) => e.date >= monthStart)
    .reduce((sum, e) => sum + e.miles, 0);
  const totalThisYear = entries
    .filter((e) => e.date >= yearStart)
    .reduce((sum, e) => sum + e.miles, 0);

  const byLabel = new Map<string, number>();
  for (const e of entries) {
    const label = entryLabel(e);
    byLabel.set(label, (byLabel.get(label) ?? 0) + e.miles);
  }
  const totalsByLabel = Array.from(byLabel.entries())
    .map(([label, miles]) => ({ label, miles }))
    .sort((a, b) => b.miles - a.miles);

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Mileage Log</h1>
        <p className="mt-1 text-zinc-500">
          Trip mileage for your trucks and rental equipment — deliveries,
          pickups, yard moves, and maintenance runs. Entered manually for now;
          ready to fill in automatically once Samsara tracking is set up.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MilesCard label="This Month" value={totalThisMonth} />
        <MilesCard label="This Year" value={totalThisYear} />
        <MilesCard label="All Time" value={totalAllTime} />
      </div>

      {totalsByLabel.length > 0 && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-700">Miles by Vehicle/Equipment</h2>
          <div className="mt-3 flex flex-col gap-2">
            {totalsByLabel.map((t) => (
              <div key={t.label} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">{t.label}</span>
                <span className="font-medium text-zinc-900">
                  {t.miles.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-zinc-700">Vehicles</h2>
        <div className="mt-3 flex flex-col gap-2">
          {vehicles.map((v) => (
            <div key={v.id} className="flex items-center justify-between text-sm">
              <span className={v.active ? "text-zinc-900" : "text-zinc-400 line-through"}>
                {v.label}
              </span>
              <form action={toggleVehicleActive.bind(null, v.id, v.active)}>
                <button
                  type="submit"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  {v.active ? "Retire" : "Reactivate"}
                </button>
              </form>
            </div>
          ))}
          {vehicles.length === 0 && (
            <p className="text-sm text-zinc-400">No vehicles added yet.</p>
          )}
        </div>
        <form action={addVehicle} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Field label="Add a vehicle" htmlFor="label">
              <input
                id="label"
                name="label"
                placeholder="e.g. 2019 Silverado 2500"
                required
                className={inputClass}
              />
            </Field>
          </div>
          <button
            type="submit"
            className="rounded-xl border border-zinc-300 px-5 py-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Add Vehicle
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Add Entry</h2>
        <form action={addMileageEntry} className="mt-3 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Vehicle / Equipment" htmlFor="target">
              <select id="target" name="target" required className={inputClass}>
                {activeVehicles.length > 0 && (
                  <optgroup label="Vehicles">
                    {activeVehicles.map((v) => (
                      <option key={v.id} value={`vehicle:${v.id}`}>
                        {v.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {equipmentItems.length > 0 && (
                  <optgroup label="Equipment">
                    {equipmentItems.map((item) => (
                      <option key={item.id} value={`equipment:${item.id}`}>
                        {item.label} ({item.category.name})
                      </option>
                    ))}
                  </optgroup>
                )}
                {activeVehicles.length === 0 && equipmentItems.length === 0 && (
                  <option value="">Nothing to select yet</option>
                )}
              </select>
            </Field>
            <Field label="Date" htmlFor="date">
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Miles" htmlFor="miles">
              <input
                id="miles"
                name="miles"
                type="number"
                step="0.1"
                min="0.1"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Purpose" htmlFor="purpose">
              <input
                id="purpose"
                name="purpose"
                list="purpose-options"
                placeholder="e.g. Yard move, Maintenance run"
                required
                className={inputClass}
              />
              <datalist id="purpose-options">
                <option value="Delivery" />
                <option value="Pickup" />
                <option value="Yard move" />
                <option value="Maintenance run" />
              </datalist>
            </Field>
          </div>
          <Field label="Notes (optional)" htmlFor="notes">
            <input id="notes" name="notes" className={inputClass} />
          </Field>
          <div>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Add Entry
            </button>
          </div>
        </form>
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-zinc-900">{entryLabel(entry)}</span>
              <span className="flex-shrink-0 text-sm font-medium text-zinc-900">
                {entry.miles.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi
              </span>
            </div>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Date</dt>
                <dd className="text-zinc-700">{formatDate(entry.date)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Purpose</dt>
                <dd className="truncate text-zinc-700">{entry.purpose}</dd>
              </div>
              {entry.booking && (
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Job</dt>
                  <dd className="truncate text-zinc-700">
                    <Link href={`/bookings/${entry.booking.id}`} className="hover:underline">
                      {entry.booking.customer.name}
                    </Link>
                  </dd>
                </div>
              )}
              {entry.notes && (
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Notes</dt>
                  <dd className="truncate text-zinc-700">{entry.notes}</dd>
                </div>
              )}
            </dl>
            <form action={deleteMileageEntry.bind(null, entry.id)} className="mt-2">
              <ConfirmButton
                message="Delete this mileage entry?"
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </ConfirmButton>
            </form>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No mileage logged yet.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Date</th>
              <th className="px-5 py-3.5 font-semibold">Vehicle / Equipment</th>
              <th className="px-5 py-3.5 font-semibold">Miles</th>
              <th className="px-5 py-3.5 font-semibold">Purpose</th>
              <th className="px-5 py-3.5 font-semibold">Job</th>
              <th className="px-5 py-3.5 font-semibold">Notes</th>
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4 text-zinc-600">{formatDate(entry.date)}</td>
                <td className="px-5 py-4 font-medium text-zinc-900">{entryLabel(entry)}</td>
                <td className="px-5 py-4 text-zinc-600">
                  {entry.miles.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </td>
                <td className="px-5 py-4 text-zinc-600">{entry.purpose}</td>
                <td className="px-5 py-4 text-zinc-600">
                  {entry.booking ? (
                    <Link href={`/bookings/${entry.booking.id}`} className="hover:underline">
                      {entry.booking.customer.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">{entry.notes ?? "—"}</td>
                <td className="px-5 py-4">
                  <form action={deleteMileageEntry.bind(null, entry.id)}>
                    <ConfirmButton
                      message="Delete this mileage entry?"
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  No mileage logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
