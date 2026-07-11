// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

const summary = [
  { label: "Total units", value: "42", color: "zinc" },
  { label: "On job", value: "18", color: "orange" },
  { label: "Available", value: "20", color: "green" },
  { label: "Sitting too long", value: "4", color: "red" },
];

const equipment = [
  { name: "Roll-Off #1", category: "20 Yard Dumpster", status: "On job", location: "220 Oak St", days: 3, color: "orange" },
  { name: "Roll-Off #2", category: "20 Yard Dumpster", status: "Available", location: "Yard", days: 0, color: "green" },
  { name: "Excavator #3", category: "Mini Excavator", status: "Needs attention", location: "88 Birch Ave", days: 9, color: "red", flagged: true },
  { name: "Trailer #4", category: "Dump Trailer", status: "In transit", location: "En route to 14 Pine Rd", days: 1, color: "amber" },
  { name: "Trailer #5", category: "Dump Trailer", status: "Available", location: "Yard", days: 0, color: "green" },
  { name: "Roll-Off #6", category: "30 Yard Dumpster", status: "On job", location: "412 Elm St", days: 6, color: "orange" },
  { name: "Roll-Off #7", category: "20 Yard Dumpster", status: "Needs attention", location: "9 Magnolia Ct", days: 11, color: "red", flagged: true },
  { name: "Trailer #8", category: "Dump Trailer", status: "Available", location: "Yard", days: 0, color: "green" },
];

export default function DesignPreviewV2EquipmentPage() {
  return (
    <PreviewShell active="Equipment">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Equipment</h1>
          <p className="mt-1 text-sm font-medium text-zinc-500">42 units — 8 shown</p>
        </div>
        <button className="rounded bg-orange-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-orange-400">
          + New unit
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => {
          const c = colorMap[s.color];
          return (
            <div key={s.label} className={`rounded border-2 ${c.border} bg-white p-4`}>
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{s.label}</p>
              <p className={`mt-1.5 text-2xl font-black ${c.text}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {["All", "On job", "Available", "In transit", "Needs attention"].map((f, i) => (
          <button
            key={f}
            className={
              i === 0
                ? "rounded border-2 border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white"
                : "rounded border-2 border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 hover:border-zinc-900"
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
            <div key={eq.name} className={`rounded border-2 bg-white p-4 ${eq.flagged ? "border-red-600" : "border-zinc-900"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-zinc-900">{eq.name}</p>
                  <p className="text-xs font-medium text-zinc-500">{eq.category}</p>
                </div>
                {eq.flagged && <span className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />}
              </div>
              <span className={`mt-3 inline-flex rounded px-2 py-0.5 text-[11px] font-black uppercase text-white ${c.solid}`}>
                {eq.status}
              </span>
              <p className="mt-3 truncate text-xs font-medium text-zinc-500">{eq.location}</p>
              {eq.days > 0 && (
                <p className={`mt-1 font-mono text-[11px] font-bold ${eq.flagged ? "text-red-600" : "text-zinc-400"}`}>
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
