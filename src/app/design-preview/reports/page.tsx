// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

const summary = [
  { label: "Revenue (this month)", value: "$42,840", trend: "+12% vs last month", color: "emerald" },
  { label: "Expenses (this month)", value: "$18,220", trend: "+4% vs last month", color: "amber" },
  { label: "Net profit", value: "$24,620", trend: "57% margin", color: "cyan" },
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
  { label: "Fuel", value: "$4,120", pct: 23, color: "cyan" },
  { label: "Dump fees", value: "$5,980", pct: 33, color: "violet" },
  { label: "Maintenance", value: "$2,340", pct: 13, color: "amber" },
  { label: "Insurance", value: "$3,100", pct: 17, color: "emerald" },
  { label: "Other", value: "$2,680", pct: 14, color: "zinc" },
];

const maxVal = Math.max(...months.flatMap((m) => [m.revenue, m.expenses]));

// Literal Tailwind class strings — colorMap's bg-*/10 opacity variants
// don't give a solid fill, and Tailwind's scanner needs the full class
// name to appear as-is in source (string concatenation at runtime won't
// be picked up).
const solidBar: Record<string, string> = {
  cyan: "bg-cyan-400",
  violet: "bg-violet-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  zinc: "bg-zinc-400",
};

export default function DesignPreviewReportsPage() {
  return (
    <PreviewShell active="Reports">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-zinc-500">Profit &amp; expense summary, last 6 months.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((s) => {
          const c = colorMap[s.color];
          return (
            <div key={s.label} className={`rounded-xl border ${c.border} ${c.bg} p-4 backdrop-blur-sm`}>
              <p className="text-xs text-zinc-400">{s.label}</p>
              <p className={`mt-1.5 font-mono text-2xl font-semibold ${c.text}`}>{s.value}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{s.trend}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-200">Revenue vs. expenses</p>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Expenses
              </span>
            </div>
          </div>
          <div className="mt-6 flex h-48 items-end gap-4 px-2">
            {months.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-t bg-emerald-400/70 shadow-[0_0_10px_-2px_rgba(52,211,153,0.6)]"
                    style={{ height: `${(m.revenue / maxVal) * 100}%` }}
                  />
                  <div
                    className="w-3 rounded-t bg-amber-400/70 shadow-[0_0_10px_-2px_rgba(251,191,36,0.6)]"
                    style={{ height: `${(m.expenses / maxVal) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-zinc-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-zinc-200">Expense breakdown</p>
          <div className="mt-4 flex flex-col gap-3">
            {breakdown.map((b) => {
              const c = colorMap[b.color];
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{b.label}</span>
                    <span className="font-mono text-zinc-500">{b.value}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full rounded-full ${solidBar[b.color]}`} style={{ width: `${b.pct * 3}%` }} />
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
