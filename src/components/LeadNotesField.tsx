"use client";

import { useRouter } from "next/navigation";

export function LeadNotesField({
  leadId,
  currentNotes,
  action,
}: {
  leadId: string;
  currentNotes: string | null;
  action: (leadId: string, formData: FormData) => Promise<void>;
}) {
  const router = useRouter();

  return (
    <input
      key={currentNotes}
      name="notes"
      defaultValue={currentNotes ?? ""}
      placeholder="Add a note…"
      onBlur={async (e) => {
        if (e.target.value === (currentNotes ?? "")) return;
        const formData = new FormData();
        formData.set("notes", e.target.value);
        await action(leadId, formData);
        router.refresh();
      }}
      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
    />
  );
}
