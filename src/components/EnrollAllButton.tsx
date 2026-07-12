"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Sequence = { id: string; name: string };

// Enrolls every lead currently shown (respects whatever status/trade
// filter is active on the Leads page) into one sequence in a single
// click, instead of enrolling leads one at a time.
export function EnrollAllButton({
  leadIds,
  sequences,
  action,
}: {
  leadIds: string[];
  sequences: Sequence[];
  action: (leadIds: string[], sequenceId: string) => Promise<{ enrolled: number; skipped: number }>;
}) {
  const router = useRouter();
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (sequences.length === 0 || leadIds.length === 0) return null;

  async function handleClick() {
    setSending(true);
    setResult(null);
    const { enrolled, skipped } = await action(leadIds, sequenceId);
    setResult(
      skipped > 0
        ? `Enrolled ${enrolled}, skipped ${skipped} (no email, wrong status, or already enrolled).`
        : `Enrolled ${enrolled}.`
    );
    setSending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-sm text-zinc-600">Enroll all {leadIds.length} shown into:</span>
      <select
        value={sequenceId}
        onChange={(e) => setSequenceId(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-base text-zinc-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:text-xs"
      >
        {sequences.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {sending ? "Enrolling…" : "Enroll All"}
      </button>
      {result && <span className="text-xs text-zinc-500">{result}</span>}
    </div>
  );
}
