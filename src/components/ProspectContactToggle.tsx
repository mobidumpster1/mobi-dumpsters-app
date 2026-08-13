"use client";

import { useState } from "react";

export function ProspectContactToggle({
  leadId,
  contacted,
  action,
}: {
  leadId: string;
  contacted: boolean;
  action: (leadId: string, status: string) => Promise<void>;
}) {
  const [isContacted, setIsContacted] = useState(contacted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const next = !isContacted;
          setPending(true);
          setError(null);
          try {
            await action(leadId, next ? "contacted" : "new");
            setIsContacted(next);
          } catch {
            setError("Couldn't update — try again.");
          } finally {
            setPending(false);
          }
        }}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
          isContacted
            ? "bg-green-100 text-green-800 hover:bg-green-200"
            : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
        }`}
      >
        {pending ? "Saving…" : isContacted ? "✓ Contacted" : "Mark Contacted"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
