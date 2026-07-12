"use client";

import { useRouter } from "next/navigation";

export function LeadEmailField({
  leadId,
  currentEmail,
  action,
}: {
  leadId: string;
  currentEmail: string | null;
  action: (leadId: string, formData: FormData) => Promise<void>;
}) {
  const router = useRouter();

  return (
    <input
      key={currentEmail}
      type="email"
      name="email"
      defaultValue={currentEmail ?? ""}
      placeholder="Add email…"
      onBlur={async (e) => {
        if (e.target.value === (currentEmail ?? "")) return;
        const formData = new FormData();
        formData.set("email", e.target.value);
        await action(leadId, formData);
        router.refresh();
      }}
      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-base text-zinc-700 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:text-xs"
    />
  );
}
