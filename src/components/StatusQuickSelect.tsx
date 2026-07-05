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
        className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
