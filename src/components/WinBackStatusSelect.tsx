"use client";

import { useRouter } from "next/navigation";
import { WINBACK_STATUS_LABELS } from "@/lib/winbackStatus";

export function WinBackStatusSelect({
  sendId,
  currentStatus,
  action,
}: {
  sendId: string;
  currentStatus: string;
  action: (sendId: string, status: string) => Promise<void>;
}) {
  const router = useRouter();

  return (
    <select
      key={currentStatus}
      defaultValue={currentStatus}
      onChange={async (e) => {
        await action(sendId, e.target.value);
        router.refresh();
      }}
      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
    >
      {Object.entries(WINBACK_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
