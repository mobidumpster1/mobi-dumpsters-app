import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Field, inputClass } from "@/components/Field";
import { updateMileageEntry } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditMileageEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entry, vehicles, equipmentItems] = await Promise.all([
    db.mileageLogEntry.findUnique({ where: { id } }),
    db.vehicle.findMany({ orderBy: { label: "asc" } }),
    db.equipmentItem.findMany({ orderBy: { label: "asc" }, include: { category: true } }),
  ]);

  if (!entry) notFound();

  const updateWithId = updateMileageEntry.bind(null, entry.id);

  // Only one representative item per category (e.g. one roll-off trailer,
  // even though there are several bins) — plus the entry's actual historical
  // item if it's a different unit in that same category, so editing doesn't
  // silently swap which specific unit this trip was recorded against.
  const haulableByCategory = new Map<string, (typeof equipmentItems)[number]>();
  for (const item of equipmentItems) {
    if (!haulableByCategory.has(item.categoryId)) haulableByCategory.set(item.categoryId, item);
  }
  const haulableEquipment = Array.from(haulableByCategory.values());
  const currentItem = equipmentItems.find((item) => item.id === entry.equipmentItemId);
  const equipmentOptions =
    currentItem && !haulableEquipment.some((item) => item.id === currentItem.id)
      ? [...haulableEquipment, currentItem]
      : haulableEquipment;

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Edit Mileage Entry</h1>
      <form action={updateWithId} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Truck" htmlFor="vehicleId">
            <select
              id="vehicleId"
              name="vehicleId"
              required
              defaultValue={entry.vehicleId ?? ""}
              className={inputClass}
            >
              <option value="">— None —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equipment I'm hauling (optional)" htmlFor="equipmentItemId">
            <select
              id="equipmentItemId"
              name="equipmentItemId"
              defaultValue={entry.equipmentItemId ?? ""}
              className={inputClass}
            >
              <option value="">— None —</option>
              {equipmentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id === entry.equipmentItemId ? `${item.label} (${item.category.name})` : item.category.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="date">
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={entry.date.toISOString().slice(0, 10)}
              className={inputClass}
            />
          </Field>
          <Field label="Purpose" htmlFor="purpose">
            <input
              id="purpose"
              name="purpose"
              defaultValue={entry.purpose}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Starting Mileage" htmlFor="odometerStart">
            <input
              id="odometerStart"
              name="odometerStart"
              type="number"
              step="0.1"
              min="0"
              required
              defaultValue={entry.odometerStart ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Ending Mileage (leave blank if still driving)" htmlFor="odometerEnd">
            <input
              id="odometerEnd"
              name="odometerEnd"
              type="number"
              step="0.1"
              min="0"
              defaultValue={entry.odometerEnd ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Notes (optional)" htmlFor="notes">
          <input id="notes" name="notes" defaultValue={entry.notes ?? ""} className={inputClass} />
        </Field>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Save Changes
          </button>
          <Link
            href="/mileage"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
