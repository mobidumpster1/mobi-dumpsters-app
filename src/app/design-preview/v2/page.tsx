// TEMPORARY design-exploration mockup — see _shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "./_shared";
import { GoogleMapPanel, type GoogleMapPin } from "../_google-map";

export const dynamic = "force-static";

const stats = [
  { label: "Active jobs", value: "18", trend: "+3 today", color: "orange" },
  { label: "Revenue this month", value: "$42.8k", trend: "+12%", color: "green" },
  { label: "Fleet utilization", value: "84%", trend: "6 idle", color: "zinc" },
  { label: "Overdue invoices", value: "3", trend: "$1,240", color: "red" },
];

const jobs = [
  { time: "8:00 AM", customer: "Ada Thompson", type: "Delivery", address: "220 Oak St", color: "green" },
  { time: "9:30 AM", customer: "Macon Roofing", type: "Delivery", address: "412 Elm St", color: "green" },
  { time: "11:00 AM", customer: "Byron Storage Co.", type: "Pickup", address: "88 Birch Ave", color: "orange" },
  { time: "1:15 PM", customer: "Ramirez Construction", type: "Delivery", address: "14 Pine Rd", color: "green" },
];

const pins: GoogleMapPin[] = [
  { label: "Ada Thompson — 220 Oak St", lat: 32.6531, lng: -83.7602, color: "cyan" },
  { label: "Macon Roofing — 412 Elm St", lat: 32.6612, lng: -83.7108, color: "cyan" },
  { label: "Byron Storage Co. — 88 Birch Ave", lat: 32.6284, lng: -83.7255, color: "amber", pulse: true },
  { label: "Ramirez Construction — 14 Pine Rd", lat: 32.6702, lng: -83.6944, color: "cyan" },
];

export default function DesignPreviewV2Page() {
  return (
    <PreviewShell active="Dispatch">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Good afternoon, Chase</h1>
          <p className="mt-1 text-sm font-medium text-zinc-500">Friday, July 11 — 6 jobs scheduled today</p>
        </div>
        <button className="rounded bg-orange-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-orange-400">
          + New booking
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
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
          <p className="text-sm font-black uppercase tracking-wide">Live dispatch map</p>
          <div className="mt-3">
            <GoogleMapPanel pins={pins} dark={false} borderClassName="border-zinc-900 border-2" />
          </div>
        </div>

        <div className="rounded border-2 border-zinc-900 bg-white p-4">
          <p className="text-sm font-black uppercase tracking-wide">Today&apos;s jobs</p>
          <div className="mt-3 flex flex-col gap-2">
            {jobs.map((job) => {
              const c = colorMap[job.color];
              return (
                <div key={job.time} className={`rounded border-2 ${c.border} ${c.bg} px-3 py-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-600">{job.time}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase text-white ${c.solid}`}>
                      {job.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-zinc-900">{job.customer}</p>
                  <p className="text-xs font-medium text-zinc-500">{job.address}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
