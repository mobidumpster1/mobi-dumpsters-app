// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";
import { GoogleMapPanel, type GoogleMapPin } from "../../_google-map";

export const dynamic = "force-static";

const jobs = [
  { time: "8:00 AM", customer: "Ada Thompson", type: "Delivery", address: "220 Oak St", color: "green" },
  { time: "9:30 AM", customer: "Macon Roofing", type: "Delivery", address: "412 Elm St", color: "green" },
  { time: "11:00 AM", customer: "Byron Storage Co.", type: "Pickup", address: "88 Birch Ave", color: "amber" },
  { time: "1:15 PM", customer: "Ramirez Construction", type: "Delivery", address: "14 Pine Rd", color: "green" },
  { time: "2:45 PM", customer: "Perimeter Demo LLC", type: "Pickup", address: "9 Magnolia Ct", color: "amber" },
  { time: "4:00 PM", customer: "Tyler Novak", type: "Pickup", address: "301 Cedar Ln", color: "amber" },
];

const pins: GoogleMapPin[] = [
  { label: "Ada Thompson — 220 Oak St", lat: 32.6531, lng: -83.7602, color: "cyan" },
  { label: "Macon Roofing — 412 Elm St", lat: 32.6612, lng: -83.7108, color: "cyan" },
  { label: "Byron Storage Co. — 88 Birch Ave", lat: 32.6284, lng: -83.7255, color: "amber" },
  { label: "Ramirez Construction — 14 Pine Rd", lat: 32.6702, lng: -83.6944, color: "cyan", pulse: true },
  { label: "Perimeter Demo LLC — 9 Magnolia Ct", lat: 32.6198, lng: -83.7389, color: "amber" },
  { label: "Tyler Novak — 301 Cedar Ln", lat: 32.6395, lng: -83.7811, color: "amber" },
];

export default function DesignPreviewV2CalendarPage() {
  return (
    <PreviewShell active="Calendar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm font-medium text-zinc-500">Friday, July 11 — 6 jobs scheduled</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded border-2 border-zinc-900">
            {["Day", "Week", "Month"].map((v, i) => (
              <button
                key={v}
                className={
                  i === 0
                    ? "bg-zinc-900 px-3 py-2 text-xs font-bold text-white"
                    : "bg-white px-3 py-2 text-xs font-bold text-zinc-600"
                }
              >
                {v}
              </button>
            ))}
          </div>
          <button className="rounded bg-orange-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-orange-400">
            + New booking
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="rounded border-2 border-zinc-900 bg-white p-4 lg:col-span-2">
          <p className="text-sm font-black uppercase tracking-wide">Today&apos;s jobs</p>
          <div className="mt-3 flex flex-col gap-2">
            {jobs.map((job) => {
              const c = colorMap[job.color];
              return (
                <div key={job.time + job.customer} className={`rounded border-2 ${c.border} ${c.bg} px-3 py-2.5`}>
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

        <div className="rounded border-2 border-zinc-900 bg-white p-4 lg:col-span-3">
          <p className="text-sm font-black uppercase tracking-wide">Route map</p>
          <div className="mt-3">
            <GoogleMapPanel pins={pins} dark={false} borderClassName="border-2 border-zinc-900" className="h-[26rem]" />
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
