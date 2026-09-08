"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

export function DriverQuickSelect({
  bookingId,
  currentDriverId,
  drivers,
  action,
}: {
  bookingId: string;
  currentDriverId: string | null;
  drivers: { id: string; name: string }[];
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
      <label htmlFor="driverId" className="text-sm text-zinc-500">
        Driver:
      </label>
      <select
        key={currentDriverId ?? "none"}
        id="driverId"
        name="driverId"
        defaultValue={currentDriverId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-full border-2 border-zinc-900 bg-white px-3 py-1.5 text-base font-bold text-zinc-900 transition-colors hover:bg-zinc-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:text-xs"
      >
        <option value="">Unassigned</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </form>
  );
}
