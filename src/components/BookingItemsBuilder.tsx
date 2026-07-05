"use client";

import { useState } from "react";
import { inputClass } from "@/components/Field";
import { formatEquipmentStatus } from "@/lib/equipmentStatus";

type EquipmentOption = {
  id: string;
  label: string;
  categoryName: string;
  status: string;
};

type BookingItemRow = {
  equipmentItemId: string;
  startDate: string;
  expectedReturnDate: string;
  price: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingItemsBuilder({
  equipmentOptions,
}: {
  equipmentOptions: EquipmentOption[];
}) {
  const [rows, setRows] = useState<BookingItemRow[]>([
    {
      equipmentItemId: equipmentOptions[0]?.id ?? "",
      startDate: today(),
      expectedReturnDate: "",
      price: "",
    },
  ]);

  function updateRow(index: number, patch: Partial<BookingItemRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        equipmentItemId: equipmentOptions[0]?.id ?? "",
        startDate: today(),
        expectedReturnDate: "",
        price: "",
      },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">
          Equipment for This Booking
        </h3>
        <button
          type="button"
          onClick={addRow}
          className="text-sm font-semibold text-brand hover:underline"
        >
          + Add Item
        </button>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-12 gap-2 rounded-xl border border-zinc-200 p-3"
        >
          <select
            className={`${inputClass} col-span-4`}
            value={row.equipmentItemId}
            onChange={(e) =>
              updateRow(index, { equipmentItemId: e.target.value })
            }
          >
            {equipmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.categoryName}) —{" "}
                {formatEquipmentStatus(option.status)}
              </option>
            ))}
          </select>
          <input
            type="date"
            className={`${inputClass} col-span-3`}
            value={row.startDate}
            onChange={(e) => updateRow(index, { startDate: e.target.value })}
            required
          />
          <input
            type="date"
            className={`${inputClass} col-span-3`}
            value={row.expectedReturnDate}
            onChange={(e) =>
              updateRow(index, { expectedReturnDate: e.target.value })
            }
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price"
            className={`${inputClass} col-span-1`}
            value={row.price}
            onChange={(e) => updateRow(index, { price: e.target.value })}
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            className="col-span-1 text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="text-sm text-zinc-400">No items added.</p>
      )}
      <input
        type="hidden"
        name="bookingItemsJson"
        value={JSON.stringify(rows)}
      />
    </div>
  );
}
