"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

export function VehicleQuickSelect({
  bookingId,
  currentVehicleId,
  vehicles,
  action,
}: {
  bookingId: string;
  currentVehicleId: string | null;
  vehicles: { id: string; label: string }[];
  action: (bookingId: string, formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(bookingId, formData);
        router.refresh();
      }}
      className="flex items-center gap-2"
    >
      <label htmlFor="vehicleId" className="text-sm text-zinc-500">
        Truck:
      </label>
      <select
        key={currentVehicleId ?? "none"}
        id="vehicleId"
        name="vehicleId"
        defaultValue={currentVehicleId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        <option value="">Not set</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
    </form>
  );
}
