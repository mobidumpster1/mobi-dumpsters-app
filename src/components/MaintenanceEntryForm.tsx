"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { MAINTENANCE_TYPE_LABELS } from "@/lib/maintenance";
import { addMaintenanceEntry } from "@/app/(internal)/maintenance/actions";

type VehicleOption = { id: string; label: string };
type EquipmentOption = { id: string; label: string };

// Calls addMaintenanceEntry directly (not via <form action>) so a
// validation throw (e.g. "select a vehicle or equipment") shows a
// friendly inline error instead of crashing to Next's generic error
// page — the established fix for any new form that can throw.
export function MaintenanceEntryForm({
  vehicles,
  equipmentItems,
}: {
  vehicles: VehicleOption[];
  equipmentItems: EquipmentOption[];
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    setError(null);
    try {
      await addMaintenanceEntry(new FormData(form));
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vehicle" htmlFor="vehicleId">
          <select id="vehicleId" name="vehicleId" defaultValue="" className={inputClass}>
            <option value="">— None —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Equipment" htmlFor="equipmentItemId">
          <select id="equipmentItemId" name="equipmentItemId" defaultValue="" className={inputClass}>
            <option value="">— None —</option>
            {equipmentItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">Pick a vehicle or a piece of equipment (at least one).</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="type">
          <select id="type" name="type" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select a type…
            </option>
            {Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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

      <Field label="Description" htmlFor="description">
        <input
          id="description"
          name="description"
          required
          className={inputClass}
          placeholder="e.g. Replaced rear brake pads"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Cost (optional)" htmlFor="cost">
          <input id="cost" name="cost" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
        <Field label="Vendor (optional)" htmlFor="vendor">
          <input id="vendor" name="vendor" className={inputClass} placeholder="e.g. Joe's Diesel" />
        </Field>
        <Field label="Odometer at Service (optional)" htmlFor="odometerAtService">
          <input
            id="odometerAtService"
            name="odometerAtService"
            type="number"
            step="0.1"
            min="0"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Next Service Due (optional)" htmlFor="nextServiceDue">
        <input id="nextServiceDue" name="nextServiceDue" type="date" className={inputClass} />
      </Field>

      <Field label="Notes (optional)" htmlFor="notes">
        <input id="notes" name="notes" className={inputClass} />
      </Field>

      <Field label="Receipt (optional)" htmlFor="receipt">
        <input id="receipt" name="receipt" type="file" className={inputClass} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add Entry"}
        </button>
      </div>
    </form>
  );
}
