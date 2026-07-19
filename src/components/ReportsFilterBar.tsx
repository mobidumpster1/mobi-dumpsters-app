import Link from "next/link";
import { inputClass } from "@/components/Field";
import { reportPresets } from "@/lib/dateRange";

// Presets are plain links (query-string navigation, no client JS needed);
// the custom range is a plain GET form for the same reason — the whole
// bar works even with JS disabled, and print:hidden keeps it off a
// printed report.
export function ReportsFilterBar({ from, to }: { from?: string; to?: string }) {
  const presets = reportPresets(new Date());
  const activePreset = presets.find((p) => p.from === from && p.to === to);
  const hasCustomRange = Boolean(from && to);

  const pillClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
      active ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
    }`;

  return (
    <div className="print:hidden flex flex-col gap-3 rounded-lg border-2 border-zinc-900 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Period</span>
        <Link href="/reports" className={pillClass(!hasCustomRange)}>
          All Time
        </Link>
        {presets.map((p) => (
          <Link key={p.label} href={`/reports?from=${p.from}&to=${p.to}`} className={pillClass(activePreset === p)}>
            {p.label}
          </Link>
        ))}
      </div>
      <form method="GET" action="/reports" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs font-medium text-zinc-500">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className={`${inputClass} px-3 py-2 text-sm`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs font-medium text-zinc-500">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className={`${inputClass} px-3 py-2 text-sm`} />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Apply Custom Range
        </button>
      </form>
    </div>
  );
}
