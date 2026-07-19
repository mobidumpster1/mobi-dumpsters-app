"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { MAINTENANCE_TYPE_LABELS } from "@/lib/maintenance";
import { addMaintenanceEntry } from "@/app/(internal)/maintenance/actions";
import { quickAddVehicle } from "@/app/(internal)/mileage/actions";

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

  const [vehicleOptions, setVehicleOptions] = useState(vehicles);
  const [vehicleId, setVehicleId] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicleLabel, setNewVehicleLabel] = useState("");
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [addVehicleError, setAddVehicleError] = useState<string | null>(null);

  async function handleAddVehicle() {
    if (!newVehicleLabel.trim()) {
      setAddVehicleError("Name is required");
      return;
    }
    setAddingVehicle(true);
    setAddVehicleError(null);
    try {
      const formData = new FormData();
      formData.set("label", newVehicleLabel);
      const vehicle = await quickAddVehicle(formData);
      setVehicleOptions((prev) =>
        prev.some((v) => v.id === vehicle.id)
          ? prev
          : [...prev, vehicle].sort((a, b) => a.label.localeCompare(b.label))
      );
      setVehicleId(vehicle.id);
      setShowAddVehicle(false);
      setNewVehicleLabel("");
    } catch (err) {
      setAddVehicleError(err instanceof Error ? err.message : "Couldn't add that vehicle");
    } finally {
      setAddingVehicle(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    setError(null);
    try {
      await addMaintenanceEntry(new FormData(form));
      form.reset();
      setVehicleId("");
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
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                id="vehicleId"
                name="vehicleId"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className={`flex-1 ${inputClass}`}
              >
                <option value="">— None —</option>
                {vehicleOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddVehicle((v) => !v)}
                className="flex-shrink-0 rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                {showAddVehicle ? "Cancel" : "+ New Vehicle"}
              </button>
            </div>

            {showAddVehicle && (
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <input
                  placeholder="e.g. 2004 F250"
                  className={inputClass}
                  value={newVehicleLabel}
                  onChange={(e) => setNewVehicleLabel(e.target.value)}
                />
                {addVehicleError && <p className="text-sm text-red-600">{addVehicleError}</p>}
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  disabled={addingVehicle}
                  className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
                >
                  {addingVehicle ? "Adding…" : "Add Vehicle"}
                </button>
              </div>
            )}
          </div>
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
