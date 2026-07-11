// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";
import { GoogleMapPanel, type GoogleMapPin } from "../_google-map";

export const dynamic = "force-static";

const jobs = [
  { time: "8:00 AM", customer: "Ada Thompson", type: "Delivery", address: "220 Oak St", color: "cyan" },
  { time: "9:30 AM", customer: "Macon Roofing", type: "Delivery", address: "412 Elm St", color: "cyan" },
  { time: "11:00 AM", customer: "Byron Storage Co.", type: "Pickup", address: "88 Birch Ave", color: "violet" },
  { time: "1:15 PM", customer: "Ramirez Construction", type: "Delivery", address: "14 Pine Rd", color: "cyan" },
  { time: "2:45 PM", customer: "Perimeter Demo LLC", type: "Pickup", address: "9 Magnolia Ct", color: "violet" },
  { time: "4:00 PM", customer: "Tyler Novak", type: "Pickup", address: "301 Cedar Ln", color: "violet" },
];

const pins: GoogleMapPin[] = [
  { label: "Ada Thompson — 220 Oak St", lat: 32.6531, lng: -83.7602, color: "cyan" },
  { label: "Macon Roofing — 412 Elm St", lat: 32.6612, lng: -83.7108, color: "cyan" },
  { label: "Byron Storage Co. — 88 Birch Ave", lat: 32.6284, lng: -83.7255, color: "violet" },
  { label: "Ramirez Construction — 14 Pine Rd", lat: 32.6702, lng: -83.6944, color: "cyan", pulse: true },
  { label: "Perimeter Demo LLC — 9 Magnolia Ct", lat: 32.6198, lng: -83.7389, color: "violet" },
  { label: "Tyler Novak — 301 Cedar Ln", lat: 32.6395, lng: -83.7811, color: "violet" },
];

export default function DesignPreviewCalendarPage() {
  return (
    <PreviewShell active="Calendar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-500">Friday, July 11 — 6 jobs scheduled</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
            {["Day", "Week", "Month"].map((v, i) => (
              <button
                key={v}
                className={
                  i === 0
                    ? "rounded-md bg-cyan-500/15 px-3 py-1.5 font-medium text-cyan-200"
                    : "rounded-md px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                }
              >
                {v}
              </button>
            ))}
          </div>
          <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]">
            + New booking
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm lg:col-span-2">
          <p className="text-sm font-medium text-zinc-200">Today's jobs</p>
          <div className="mt-3 flex flex-col gap-2">
            {jobs.map((job) => {
              const c = colorMap[job.color];
              return (
                <div
                  key={job.time + job.customer}
                  className={`flex items-center gap-3 rounded-lg border ${c.border} ${c.bg} px-3 py-2.5`}
                >
                  <span className="w-16 flex-shrink-0 font-mono text-xs text-zinc-500">{job.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{job.customer}</p>
                    <p className="truncate text-xs text-zinc-500">{job.address}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full border ${c.border} ${c.bg} px-2 py-0.5 text-[11px] font-medium ${c.text}`}>
                    {job.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-200">Route map</p>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <div className="mt-3">
            <GoogleMapPanel pins={pins} className="h-[26rem]" />
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
