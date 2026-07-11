// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

const customers = [
  { name: "Ada Thompson", phone: "(478) 342-0456", tag: "Residential", bookings: 3, lifetime: "$1,240", status: "Active", color: "emerald" },
  { name: "Ramirez Construction", phone: "(478) 555-0113", tag: "Commercial", bookings: 11, lifetime: "$9,860", status: "Active", color: "emerald" },
  { name: "J. Alvarez", phone: "(478) 220-9981", tag: "Residential", bookings: 1, lifetime: "$249", status: "New", color: "cyan" },
  { name: "Byron Storage Co.", phone: "(478) 771-2200", tag: "Commercial", bookings: 6, lifetime: "$4,120", status: "Active", color: "emerald" },
  { name: "Melissa Ford", phone: "(478) 981-2244", tag: "Residential", bookings: 2, lifetime: "$498", status: "Overdue", color: "amber" },
  { name: "Perimeter Demo LLC", phone: "(478) 665-0091", tag: "Commercial", bookings: 4, lifetime: "$6,700", status: "Active", color: "emerald" },
  { name: "Tyler Novak", phone: "(478) 112-6690", tag: "Residential", bookings: 1, lifetime: "$310", status: "New", color: "cyan" },
  { name: "Macon Roofing", phone: "(478) 900-4471", tag: "Commercial", bookings: 8, lifetime: "$7,320", status: "Active", color: "emerald" },
];

export default function DesignPreviewCustomersPage() {
  return (
    <PreviewShell active="Customers">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-zinc-500">142 total — 8 shown</p>
        </div>
        <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]">
          + New customer
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <input
          placeholder="Search customers by name, phone, or address…"
          className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none"
          readOnly
        />
        <button className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-zinc-400">
          Filter
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Bookings</th>
              <th className="px-4 py-3 font-medium">Lifetime value</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {customers.map((c) => {
              const col = colorMap[c.color];
              return (
                <tr key={c.name} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-zinc-100">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{c.phone}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.tag}</td>
                  <td className="px-4 py-3 font-mono text-zinc-300">{c.bookings}</td>
                  <td className="px-4 py-3 font-mono text-zinc-300">{c.lifetime}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border ${col.border} ${col.bg} px-2 py-0.5 text-[11px] font-medium ${col.text}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PreviewShell>
  );
}
