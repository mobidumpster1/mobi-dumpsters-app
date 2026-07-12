"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_LABELS } from "@/lib/leadStatus";

export function LeadStatusSelect({
  leadId,
  currentStatus,
  action,
}: {
  leadId: string;
  currentStatus: string;
  action: (leadId: string, status: string) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form ref={formRef}>
      <select
        key={currentStatus}
        name="status"
        defaultValue={currentStatus}
        onChange={async (e) => {
          await action(leadId, e.target.value);
          router.refresh();
        }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-full border-2 border-zinc-900 bg-white px-3 py-1.5 text-base font-bold text-zinc-900 transition-colors hover:bg-zinc-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:text-xs"
      >
        {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
