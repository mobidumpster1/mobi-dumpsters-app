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
  startTime: string;
  expectedReturnDate: string;
  expectedReturnTime: string;
  price: string;
};

// Combines a date input's value with an optional time input's value into a
// literal UTC timestamp string — matching the rest of this app's pattern of
// storing wall-clock digits as UTC and always formatting them back out with
// UTC getters, instead of doing real timezone conversion (which the app has
// no per-user timezone data to do correctly anyway).
function combineDateAndTime(date: string, time: string) {
  if (!date) return "";
  return time ? `${date}T${time}:00.000Z` : date;
}

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
      startTime: "",
      expectedReturnDate: "",
      expectedReturnTime: "",
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
        startTime: "",
        expectedReturnDate: "",
        expectedReturnTime: "",
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
          className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-12"
        >
          <select
            className={`${inputClass} sm:col-span-4`}
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
          <div className="flex flex-col gap-1 sm:col-span-3">
            <input
              type="date"
              className={inputClass}
              value={row.startDate}
              onChange={(e) => updateRow(index, { startDate: e.target.value })}
              required
            />
            <input
              type="time"
              className={inputClass}
              value={row.startTime}
              onChange={(e) => updateRow(index, { startTime: e.target.value })}
              aria-label="Delivery time (optional)"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-3">
            <input
              type="date"
              className={inputClass}
              value={row.expectedReturnDate}
              onChange={(e) =>
                updateRow(index, { expectedReturnDate: e.target.value })
              }
              required
            />
            <input
              type="time"
              className={inputClass}
              value={row.expectedReturnTime}
              onChange={(e) =>
                updateRow(index, { expectedReturnTime: e.target.value })
              }
              aria-label="Pickup time (optional)"
            />
          </div>
          <input
            type="number"
            step="0.01"
            placeholder="Price"
            className={`${inputClass} sm:col-span-1`}
            value={row.price}
            onChange={(e) => updateRow(index, { price: e.target.value })}
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            className="rounded-xl py-2 text-sm font-medium text-red-600 hover:underline sm:col-span-1 sm:py-0"
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
        value={JSON.stringify(
          rows.map((r) => ({
            equipmentItemId: r.equipmentItemId,
            startDate: combineDateAndTime(r.startDate, r.startTime),
            expectedReturnDate: combineDateAndTime(
              r.expectedReturnDate,
              r.expectedReturnTime
            ),
            price: r.price,
          }))
        )}
      />
    </div>
  );
}
