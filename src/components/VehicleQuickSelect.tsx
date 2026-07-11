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
        className="rounded-full border-2 border-zinc-900 bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 transition-colors hover:bg-zinc-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
