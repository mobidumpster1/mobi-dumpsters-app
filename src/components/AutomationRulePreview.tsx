"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { previewRule, runRuleNowAction } from "@/app/(internal)/automation/actions";

// Dry-run preview (zero sends, zero writes) plus a manual "Run Now" that
// actually fires the rule immediately — for staff who'd rather trigger a
// rule by hand than leave it fully automated, without needing to enable
// it and wait for the daily cron. Run Now still respects the rule's own
// maxPerRun/maxPerDay and the org's daily action cap.
export function AutomationRulePreview({ ruleId }: { ruleId: string }) {
  const [result, setResult] = useState<{ matchCount: number; sample: { name: string; id: string }[] } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ sent: number; failed: number } | null>(null);
  const router = useRouter();

  async function handlePreview() {
    setLoading(true);
    setError(null);
    try {
      setResult(await previewRule(ruleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't preview that rule.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      setRunResult(await runRuleNowAction(ruleId));
      router.refresh();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Couldn't run that rule.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-700">Preview &amp; Manual Run</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
          >
            {loading ? "Checking…" : "Preview Matches"}
          </button>
          <button
            type="button"
            onClick={handleRunNow}
            disabled={running}
            className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {running ? "Running…" : "Run Now"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Run Now sends immediately, whether or not this rule is enabled — handy if you&apos;d
        rather trigger it by hand than leave it on the daily automatic schedule.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-3">
          <p className="text-sm text-zinc-700">
            Currently matches <span className="font-bold">{result.matchCount}</span> record
            {result.matchCount === 1 ? "" : "s"} that haven&apos;t fired yet.
          </p>
          {result.sample.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-500">
              {result.sample.map((s) => (
                <li key={s.id}>• {s.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {runError && <p className="mt-2 text-sm text-red-600">{runError}</p>}
      {runResult && (
        <p className="mt-2 text-sm text-green-700">
          Sent {runResult.sent}, failed {runResult.failed}. See Recent Activity below for details.
        </p>
      )}
    </div>
  );
}
