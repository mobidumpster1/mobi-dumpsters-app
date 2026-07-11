// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

const staff = [
  { name: "Chase Vann", email: "owner@mobidumpsters.com", role: "Owner", color: "cyan" },
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
    <span
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-cyan-500/40" : "bg-white/10"
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6 shadow-[0_0_10px_1px_rgba(34,211,238,0.6)]" : "translate-x-1"
        }`}
      />
    </span>
  );
}

export default function DesignPreviewSettingsPage() {
  return (
    <PreviewShell active="Settings">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
        <p className="text-sm font-medium text-zinc-200">Branding</p>
        <p className="mt-1 text-xs text-zinc-500">Your logo and brand color, shown throughout the app.</p>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-semibold text-black">
              R
            </div>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:border-white/20">
              Change logo
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">Primary color</span>
            <div className="flex gap-2">
              {["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#f472b6"].map((hex, i) => (
                <button
                  key={hex}
                  className={`h-7 w-7 rounded-full border-2 ${i === 0 ? "border-white" : "border-transparent"}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
        <p className="text-sm font-medium text-zinc-200">Staff accounts</p>
        <p className="mt-1 text-xs text-zinc-500">You (the owner) always have full access.</p>
        <div className="mt-4 flex flex-col gap-2">
          {staff.map((s) => {
            const c = colorMap[s.color];
            return (
              <div key={s.email} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{s.name}</p>
                  <p className="text-xs text-zinc-500">{s.email}</p>
                </div>
                <span className={`rounded-full border ${c.border} ${c.bg} px-2 py-0.5 text-[11px] font-medium ${c.text}`}>
                  {s.role}
                </span>
              </div>
            );
          })}
        </div>
        <button className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-200">
          + Add staff account
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
        <p className="text-sm font-medium text-zinc-200">Notifications</p>
        <div className="mt-4 flex flex-col divide-y divide-white/5">
          {toggles.map((t) => (
            <div key={t.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm text-zinc-200">{t.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{t.desc}</p>
              </div>
              <Toggle on={t.on} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
        <p className="text-sm font-medium text-zinc-200">Integrations</p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">QuickBooks Online</p>
            <p className="text-xs text-emerald-300">Connected</p>
          </div>
          <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:border-white/20">
            Manage
          </button>
        </div>
      </div>
    </PreviewShell>
  );
}
