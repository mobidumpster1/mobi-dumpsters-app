// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell, colorMap } from "../_shared";

export const dynamic = "force-static";

export default function DesignPreviewBookingPage() {
  return (
    <PreviewShell active="Dispatch">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">Booking #B-1042</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Ada Thompson</h1>
          <p className="mt-1 text-sm text-zinc-500">220 Oak St, Byron, GA</p>
        </div>
        <div className="flex gap-2">
          <span className={`inline-flex items-center rounded-full border ${colorMap.emerald.border} ${colorMap.emerald.bg} px-3 py-1 text-xs font-medium ${colorMap.emerald.text}`}>
            On job
          </span>
          <button className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-white/20">
            Edit
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
            <p className="text-sm font-medium text-zinc-200">Items</p>
            <div className="mt-3 flex flex-col gap-3">
              {[
                { label: "20 Yard Dumpster", window: "Jul 6 – Jul 13", price: "$249.00", color: "cyan" },
              ].map((item) => {
                const c = colorMap[item.color];
                return (
                  <div key={item.label} className={`flex items-center justify-between rounded-lg border ${c.border} ${c.bg} px-4 py-3`}>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{item.label}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{item.window}</p>
                    </div>
                    <p className={`font-mono text-sm font-medium ${c.text}`}>{item.price}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4 text-sm">
              <span className="text-zinc-500">Total</span>
              <span className="font-mono text-base font-semibold text-zinc-100">$249.00</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
            <p className="text-sm font-medium text-zinc-200">Timeline</p>
            <div className="mt-4 flex flex-col gap-4 text-xs">
              {[
                { time: "Jul 6, 9:14am", text: "Delivered to 220 Oak St", color: "emerald" },
                { time: "Jul 6, 8:02am", text: "Marked \"On My Way\"", color: "cyan" },
                { time: "Jul 3, 2:40pm", text: "Booking confirmed by staff", color: "violet" },
                { time: "Jul 3, 1:15pm", text: "Request submitted online", color: "zinc" },
              ].map((t, i) => {
                const c = colorMap[t.color];
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${c.bg} border ${c.border}`} />
                    <div>
                      <p className="text-zinc-300">{t.text}</p>
                      <p className="mt-0.5 font-mono text-zinc-600">{t.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
            <p className="text-sm font-medium text-zinc-200">Customer</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-semibold text-black">
                AT
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">Ada Thompson</p>
                <p className="text-xs text-zinc-500">peggysugar73@gmail.com</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Phone</span>
                <span className="font-mono text-zinc-300">(478) 342-0456</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Lifetime value</span>
                <span className="font-mono text-zinc-300">$1,240</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
            <p className="text-sm font-medium text-zinc-200">Quick actions</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2.5 text-left text-cyan-200">
                Mark returned
              </button>
              <button className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-left text-zinc-300 hover:border-white/20">
                Send invoice
              </button>
              <button className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-left text-zinc-300 hover:border-white/20">
                Message customer
              </button>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
