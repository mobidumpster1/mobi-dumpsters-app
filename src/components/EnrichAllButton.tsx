"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Scrapes every not-yet-attempted lead's website (up to the server-side
// batch cap) for an email address and social links in one click, instead
// of running the per-lead "Find Contact Info" button one at a time.
export function EnrichAllButton({
  pendingCount,
  action,
}: {
  pendingCount: number;
  action: () => Promise<{ processed: number; found: number }>;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (pendingCount === 0) return null;

  async function handleClick() {
    setRunning(true);
    setResult(null);
    const { processed, found } = await action();
    setResult(
      processed === 0
        ? "Nothing left to scrape."
        : `Scraped ${processed}, found contact info for ${found}.`
    );
    setRunning(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-sm text-zinc-600">
        {pendingCount} lead{pendingCount === 1 ? "" : "s"} with a website not yet scraped for
        contact info.
      </span>
      <button
        type="button"
        onClick={handleClick}
        disabled={running}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {running ? "Scraping…" : "Find Contact Info"}
      </button>
      {result && <span className="text-xs text-zinc-500">{result}</span>}
    </div>
  );
}
