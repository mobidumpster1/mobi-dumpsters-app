"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/equipmentStatus";

export function StatusQuickSelect({
  itemId,
  currentStatus,
  action,
}: {
  itemId: string;
  currentStatus: string;
  action: (itemId: string, formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(itemId, formData);
        router.refresh();
      }}
    >
      <select
        key={currentStatus}
        name="status"
        defaultValue={currentStatus}
        onChange={() => formRef.current?.requestSubmit()}
        onClick={(e) => e.stopPropagation()}
        className="rounded-full border-2 border-zinc-900 bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 transition-colors hover:bg-zinc-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
