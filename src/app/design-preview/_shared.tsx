// Shared shell for the TEMPORARY design-exploration mockups under
// /design-preview — not wired to real data. Delete this whole directory
// (and the /design-preview entry in src/proxy.ts's PUBLIC_PATHS) once a
// direction is picked.
//
// Kept as a plain (non-"use client") module so colorMap can be imported
// directly by the server-rendered mockup pages — the interactive mobile
// nav lives in ./_mobile-nav.tsx instead, since a "use client" export
// turns even plain data like colorMap into an unusable client reference
// when pulled into a server component.

import { MobileNav } from "./_mobile-nav";

export const colorMap: Record<string, { text: string; bg: string; border: string }> = {
  cyan: { text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  emerald: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  violet: { text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  amber: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  zinc: { text: "text-zinc-300", bg: "bg-white/5", border: "border-white/10" },
};

export const NAV_ITEMS = [
  { label: "Dispatch", href: "/design-preview" },
  { label: "Calendar", href: "/design-preview/calendar" },
  { label: "Customers", href: "/design-preview/customers" },
  { label: "Equipment", href: "/design-preview/equipment" },
  { label: "Invoices", href: "/design-preview/invoices" },
  { label: "Reports", href: "/design-preview/reports" },
  { label: "Settings", href: "/design-preview/settings" },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-semibold text-black">
        R
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-white">Rentflow</p>
        <p className="text-[11px] text-zinc-500">Mobi Dumpsters LLC</p>
      </div>
    </div>
  );
}

export function PreviewShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen text-zinc-100"
      style={{
        background:
          "radial-gradient(circle at 15% 0%, rgba(34,211,238,0.08), transparent 40%), radial-gradient(circle at 85% 100%, rgba(167,139,250,0.08), transparent 40%), #05070a",
      }}
    >
      <MobileNav active={active} />

      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/5 bg-white/[0.02] px-4 py-6 backdrop-blur-xl md:flex">
          <div className="px-2">
            <Logo />
          </div>

          <button className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400 hover:border-white/20">
            Switch organization
            <span className="text-zinc-600">⌄</span>
          </button>

          <nav className="flex flex-col gap-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={
                  item.label === active
                    ? "rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]"
                    : "rounded-lg px-3 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-zinc-400">
            <p className="font-medium text-zinc-200">Chase Vann</p>
            <p className="text-zinc-500">Owner</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-10 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
