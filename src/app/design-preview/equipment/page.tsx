// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

const summary = [
  { label: "Total units", value: "42", color: "zinc" },
  { label: "On job", value: "18", color: "cyan" },
  { label: "Available", value: "20", color: "emerald" },
  { label: "Sitting too long", value: "4", color: "amber" },
];

const equipment = [
  { name: "Roll-Off #1", category: "20 Yard Dumpster", status: "On job", location: "220 Oak St", days: 3, color: "cyan" },
  { name: "Roll-Off #2", category: "20 Yard Dumpster", status: "Available", location: "Yard", days: 0, color: "emerald" },
  { name: "Excavator #3", category: "Mini Excavator", status: "On job", location: "88 Birch Ave", days: 9, color: "amber", flagged: true },
  { name: "Trailer #4", category: "Dump Trailer", status: "In transit", location: "En route to 14 Pine Rd", days: 1, color: "violet" },
  { name: "Trailer #5", category: "Dump Trailer", status: "Available", location: "Yard", days: 0, color: "emerald" },
  { name: "Roll-Off #6", category: "30 Yard Dumpster", status: "On job", location: "412 Elm St", days: 6, color: "cyan" },
  { name: "Roll-Off #7", category: "20 Yard Dumpster", status: "On job", location: "9 Magnolia Ct", days: 11, color: "amber", flagged: true },
  { name: "Trailer #8", category: "Dump Trailer", status: "Available", location: "Yard", days: 0, color: "emerald" },
];

export default function DesignPreviewEquipmentPage() {
  return (
    <PreviewShell active="Equipment">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment</h1>
          <p className="mt-1 text-sm text-zinc-500">42 units — 8 shown</p>
        </div>
        <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]">
          + New unit
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => {
          const c = colorMap[s.color];
          return (
            <div key={s.label} className={`rounded-xl border ${c.border} ${c.bg} p-4 backdrop-blur-sm`}>
              <p className="text-xs text-zinc-400">{s.label}</p>
              <p className={`mt-1.5 font-mono text-2xl font-semibold ${c.text}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {["All", "On job", "Available", "In transit", "Sitting too long"].map((f, i) => (
          <button
            key={f}
            className={
              i === 0
                ? "rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200"
                : "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:border-white/20"
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {equipment.map((eq) => {
          const c = colorMap[eq.color];
          return (
            <div
              key={eq.name}
              className={`relative overflow-hidden rounded-xl border p-4 backdrop-blur-sm ${
                eq.flagged ? "border-amber-500/40 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {eq.flagged && (
                <span className="absolute right-3 top-3 flex h-2 w-2 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]" />
              )}
              <p className="text-sm font-medium text-zinc-100">{eq.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{eq.category}</p>
              <span className={`mt-3 inline-flex rounded-full border ${c.border} ${c.bg} px-2 py-0.5 text-[11px] font-medium ${c.text}`}>
                {eq.status}
              </span>
              <p className="mt-3 truncate text-xs text-zinc-500">{eq.location}</p>
              {eq.days > 0 && (
                <p className={`mt-1 font-mono text-[11px] ${eq.flagged ? "text-amber-300" : "text-zinc-600"}`}>
                  {eq.days} {eq.days === 1 ? "day" : "days"} out
                </p>
              )}
            </div>
          );
        })}
      </div>
    </PreviewShell>
  );
}
