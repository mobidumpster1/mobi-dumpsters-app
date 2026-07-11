// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

const summary = [
  { label: "Revenue (this month)", value: "$42,840", trend: "+12% vs last month", color: "green" },
  { label: "Expenses (this month)", value: "$18,220", trend: "+4% vs last month", color: "amber" },
  { label: "Net profit", value: "$24,620", trend: "57% margin", color: "orange" },
];

const months = [
  { label: "Feb", revenue: 38, expenses: 22 },
  { label: "Mar", revenue: 41, expenses: 19 },
  { label: "Apr", revenue: 35, expenses: 24 },
  { label: "May", revenue: 47, expenses: 21 },
  { label: "Jun", revenue: 44, expenses: 20 },
  { label: "Jul", revenue: 43, expenses: 18 },
];

const breakdown = [
  { label: "Fuel", value: "$4,120", pct: 23, color: "orange" },
  { label: "Dump fees", value: "$5,980", pct: 33, color: "zinc" },
  { label: "Maintenance", value: "$2,340", pct: 13, color: "amber" },
  { label: "Insurance", value: "$3,100", pct: 17, color: "green" },
  { label: "Other", value: "$2,680", pct: 14, color: "red" },
];

const maxVal = Math.max(...months.flatMap((m) => [m.revenue, m.expenses]));

export default function DesignPreviewV2ReportsPage() {
  return (
    <PreviewShell active="More">
      <h1 className="text-3xl font-black tracking-tight">Reports</h1>
      <p className="mt-1 text-sm font-medium text-zinc-500">Profit &amp; expense summary, last 6 months.</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summary.map((s) => {
          const c = colorMap[s.color];
          return (
            <div key={s.label} className={`rounded border-2 ${c.border} bg-white p-4`}>
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{s.label}</p>
              <p className={`mt-1.5 text-2xl font-black ${c.text}`}>{s.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-zinc-500">{s.trend}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded border-2 border-zinc-900 bg-white p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-wide">Revenue vs. expenses</p>
            <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Expenses
              </span>
            </div>
          </div>
          <div className="mt-6 flex h-48 items-end gap-4 px-2">
            {months.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end justify-center gap-1.5">
                  <div className="w-4 rounded-t bg-emerald-500" style={{ height: `${(m.revenue / maxVal) * 100}%` }} />
                  <div className="w-4 rounded-t bg-amber-500" style={{ height: `${(m.expenses / maxVal) * 100}%` }} />
                </div>
                <span className="text-[11px] font-bold text-zinc-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border-2 border-zinc-900 bg-white p-4">
          <p className="text-sm font-black uppercase tracking-wide">Expense breakdown</p>
          <div className="mt-4 flex flex-col gap-3">
            {breakdown.map((b) => {
              const c = colorMap[b.color];
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-700">{b.label}</span>
                    <span className="font-mono text-zinc-500">{b.value}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm border border-zinc-300 bg-zinc-100">
                    <div className={`h-full ${c.solid}`} style={{ width: `${b.pct * 3}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
