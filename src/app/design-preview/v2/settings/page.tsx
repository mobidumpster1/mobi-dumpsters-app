// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

const staff = [
  { name: "Chase Vann", email: "owner@mobidumpsters.com", role: "Owner", color: "orange" },
  { name: "Marcus Diaz", email: "marcus@mobidumpsters.com", role: "Staff", color: "zinc" },
  { name: "Priya Nair", email: "priya@mobidumpsters.com", role: "Staff", color: "zinc" },
];

const toggles = [
  { label: "Review request emails", desc: "Auto-send a few days after pickup.", on: true },
  { label: "Overdue invoice reminders", desc: "Nag customers until they pay.", on: true },
  { label: "24-hour delivery reminders", desc: "Text the day before a scheduled drop-off.", on: false },
];

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 border-zinc-900 transition-colors ${on ? "bg-orange-500" : "bg-white"}`}>
      <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-zinc-900 transition-transform ${on ? "translate-x-5" : "translate-x-1"}`} />
    </span>
  );
}

export default function DesignPreviewV2SettingsPage() {
  return (
    <PreviewShell active="More">
      <h1 className="text-3xl font-black tracking-tight">Settings</h1>

      <div className="mt-5 rounded border-2 border-zinc-900 bg-white p-4">
        <p className="text-sm font-black uppercase tracking-wide">Branding</p>
        <p className="mt-1 text-xs font-medium text-zinc-500">Your logo and brand color, shown throughout the app.</p>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded border-2 border-zinc-900 bg-orange-500 text-lg font-black text-zinc-950">
              M
            </div>
            <button className="rounded border-2 border-zinc-900 bg-white px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-100">
              Change logo
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-zinc-500">Primary color</span>
            <div className="flex gap-2">
              {["#f97316", "#16a34a", "#dc2626", "#2563eb", "#0f172a"].map((hex, i) => (
                <button
                  key={hex}
                  className={`h-7 w-7 rounded-full border-2 ${i === 0 ? "border-zinc-900" : "border-transparent"}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded border-2 border-zinc-900 bg-white p-4">
        <p className="text-sm font-black uppercase tracking-wide">Staff accounts</p>
        <p className="mt-1 text-xs font-medium text-zinc-500">You (the owner) always have full access.</p>
        <div className="mt-4 flex flex-col gap-2">
          {staff.map((s) => {
            const c = colorMap[s.color];
            return (
              <div key={s.email} className="flex items-center justify-between rounded border-2 border-zinc-300 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-zinc-900">{s.name}</p>
                  <p className="text-xs font-medium text-zinc-500">{s.email}</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-[11px] font-black uppercase text-white ${c.solid}`}>
                  {s.role}
                </span>
              </div>
            );
          })}
        </div>
        <button className="mt-4 rounded border-2 border-zinc-900 bg-white px-4 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-100">
          + Add staff account
        </button>
      </div>

      <div className="mt-5 rounded border-2 border-zinc-900 bg-white p-4">
        <p className="text-sm font-black uppercase tracking-wide">Notifications</p>
        <div className="mt-4 flex flex-col divide-y-2 divide-zinc-100">
          {toggles.map((t) => (
            <div key={t.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-bold text-zinc-900">{t.label}</p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500">{t.desc}</p>
              </div>
              <Toggle on={t.on} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded border-2 border-zinc-900 bg-white p-4">
        <p className="text-sm font-black uppercase tracking-wide">Integrations</p>
        <div className="mt-4 flex items-center justify-between rounded border-2 border-emerald-600 bg-emerald-50 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-zinc-900">QuickBooks Online</p>
            <p className="text-xs font-black uppercase text-emerald-700">Connected</p>
          </div>
          <button className="rounded border-2 border-zinc-900 bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 hover:bg-zinc-100">
            Manage
          </button>
        </div>
      </div>
    </PreviewShell>
  );
}
