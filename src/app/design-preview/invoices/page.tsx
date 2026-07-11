// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

const summary = [
  { label: "Outstanding", value: "$4,120", color: "amber" },
  { label: "Paid this month", value: "$18,940", color: "emerald" },
  { label: "Overdue (30+ days)", value: "$890", color: "amber" },
];

const invoices = [
  { number: "INV-0421", customer: "Macon Roofing", amount: "$1,320.00", due: "Jul 18", status: "Unpaid", color: "cyan" },
  { number: "INV-0420", customer: "Ada Thompson", amount: "$249.00", due: "Jul 06", status: "Paid", color: "emerald" },
  { number: "INV-0419", customer: "Melissa Ford", amount: "$498.00", due: "Jun 29", status: "Overdue", color: "amber" },
  { number: "INV-0418", customer: "Ramirez Construction", amount: "$2,860.00", due: "Jul 22", status: "Unpaid", color: "cyan" },
  { number: "INV-0417", customer: "Byron Storage Co.", amount: "$1,040.00", due: "Jul 02", status: "Paid", color: "emerald" },
  { number: "INV-0416", customer: "Perimeter Demo LLC", amount: "$3,200.00", due: "Jun 25", status: "Overdue", color: "amber" },
];

export default function DesignPreviewInvoicesPage() {
  return (
    <PreviewShell active="Invoices">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-zinc-500">47 total — 6 shown</p>
        </div>
        <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]">
          + New invoice
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.map((inv) => {
              const c = colorMap[inv.color];
              return (
                <tr key={inv.number} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{inv.number}</td>
                  <td className="px-4 py-3 font-medium text-zinc-100">{inv.customer}</td>
                  <td className="px-4 py-3 font-mono text-zinc-200">{inv.amount}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{inv.due}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border ${c.border} ${c.bg} px-2 py-0.5 text-[11px] font-medium ${c.text}`}>
                      {inv.status}
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
