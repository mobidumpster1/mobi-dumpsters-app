// TEMPORARY design-exploration mockup — see _shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "./_shared";
import { GoogleMapPanel, type GoogleMapPin } from "./_google-map";

export const dynamic = "force-static";

const stats = [
  { label: "Active jobs", value: "18", trend: "+3 today", color: "cyan" },
  { label: "Revenue this month", value: "$42.8k", trend: "+12%", color: "emerald" },
  { label: "Fleet utilization", value: "84%", trend: "6 idle", color: "violet" },
  { label: "Overdue invoices", value: "3", trend: "$1,240", color: "amber" },
];

const activity = [
  { time: "2m ago", text: "Dumpster #14 delivered to 220 Oak St", tag: "delivery" },
  { time: "18m ago", text: "Invoice INV-0412 paid — $890", tag: "payment" },
  { time: "41m ago", text: "New booking request from J. Alvarez", tag: "booking" },
  { time: "1h ago", text: "Excavator #3 flagged: sitting 9 days", tag: "alert" },
  { time: "2h ago", text: "Trailer #7 picked up from 88 Birch Ave", tag: "pickup" },
];

const dispatchPins: GoogleMapPin[] = [
  { label: "Roll-Off #1 — 220 Oak St", lat: 32.6531, lng: -83.7602, color: "cyan", pulse: true },
  { label: "Roll-Off #2 — Yard", lat: 32.6459, lng: -83.7466, color: "emerald" },
  { label: "Trailer #4 — En route", lat: 32.6612, lng: -83.7108, color: "violet" },
  { label: "Excavator #3 — 88 Birch Ave", lat: 32.6284, lng: -83.7255, color: "amber" },
];

const fleet = [
  { name: "Roll-Off #1", status: "On job", color: "cyan" },
  { name: "Roll-Off #2", status: "Available", color: "emerald" },
  { name: "Excavator #3", status: "Needs attention", color: "amber" },
  { name: "Trailer #4", status: "In transit", color: "violet" },
  { name: "Trailer #5", status: "Available", color: "emerald" },
  { name: "Roll-Off #6", status: "On job", color: "cyan" },
];

export default function DesignPreviewPage() {
  return (
    <PreviewShell active="Dispatch">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good afternoon, Chase</h1>
          <p className="mt-1 text-sm text-zinc-500">Friday, July 11 — 6 jobs scheduled today</p>
        </div>
        <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]">
          + New booking
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
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
            <p className="text-sm font-medium text-zinc-200">Live dispatch map</p>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <div className="mt-3">
            <GoogleMapPanel pins={dispatchPins} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-zinc-200">Activity</p>
          <div className="mt-3 flex flex-col gap-3.5">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <span className="mt-0.5 w-12 flex-shrink-0 font-mono text-zinc-600">{a.time}</span>
                <span className="text-zinc-300">{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm">
        <p className="text-sm font-medium text-zinc-200">Fleet status</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {fleet.map((f) => {
            const c = colorMap[f.color];
            return (
              <div key={f.name} className={`rounded-lg border ${c.border} ${c.bg} px-3 py-2.5`}>
                <p className="text-xs font-medium text-zinc-200">{f.name}</p>
                <p className={`mt-0.5 text-[11px] ${c.text}`}>{f.status}</p>
              </div>
            );
          })}
        </div>
      </div>
    </PreviewShell>
  );
}
