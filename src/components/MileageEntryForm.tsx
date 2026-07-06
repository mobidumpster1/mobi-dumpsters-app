"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";

type VehicleOption = { id: string; label: string };
type EquipmentOption = { id: string; label: string; categoryName: string };

export function MileageEntryForm({
  vehicles,
  equipmentItems,
  action,
}: {
  vehicles: VehicleOption[];
  equipmentItems: EquipmentOption[];
  action: (formData: FormData) => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const startNum = Number(start);
  const endNum = Number(end);
  const total =
    start !== "" && end !== "" && Number.isFinite(startNum) && Number.isFinite(endNum) && endNum > startNum
      ? endNum - startNum
      : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Truck" htmlFor="vehicleId">
          <select id="vehicleId" name="vehicleId" required className={inputClass}>
            {vehicles.length === 0 && <option value="">No trucks added yet</option>}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Equipment I'm hauling (optional)" htmlFor="equipmentItemId">
          <select id="equipmentItemId" name="equipmentItemId" defaultValue="" className={inputClass}>
            <option value="">— None —</option>
            {equipmentItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({item.categoryName})
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
            defaultValue={new Date().toISOString().slice(0, 10)}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Starting Mileage" htmlFor="odometerStart">
          <input
            id="odometerStart"
            name="odometerStart"
            type="number"
            step="0.1"
            min="0"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Ending Mileage" htmlFor="odometerEnd">
          <input
            id="odometerEnd"
            name="odometerEnd"
            type="number"
            step="0.1"
            min="0"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">Total Miles</span>
          <div
            className={`${inputClass} flex items-center bg-zinc-50 font-semibold text-zinc-900`}
          >
            {total !== null ? total.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
          </div>
        </div>
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
  );
}
