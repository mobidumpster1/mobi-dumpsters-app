// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
// A second, deliberately different layout direction from the dark/glow
// mockup at /design-preview: bold, high-contrast, flat "field-ops utility"
// style — solid colors instead of translucent glass, thick borders instead
// of thin glowing ones, and a bottom tab bar on mobile instead of a
// hamburger drawer, since crews mostly use this one-handed in a truck.

export const colorMap: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  orange: { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-600", solid: "bg-orange-500" },
  green: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-600", solid: "bg-emerald-500" },
  amber: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-600", solid: "bg-amber-500" },
  red: { text: "text-red-700", bg: "bg-red-50", border: "border-red-600", solid: "bg-red-500" },
  zinc: { text: "text-zinc-700", bg: "bg-zinc-100", border: "border-zinc-400", solid: "bg-zinc-500" },
};

const NAV_ITEMS = [
  { label: "Dispatch", href: "/design-preview/v2", icon: "truck" },
  { label: "Calendar", href: "/design-preview/v2/calendar", icon: "calendar" },
  { label: "Equipment", href: "/design-preview/v2/equipment", icon: "box" },
  { label: "More", href: "/design-preview/v2/more", icon: "more" },
] as const;

function NavIcon({ icon }: { icon: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "h-6 w-6" };
  switch (icon) {
    case "truck":
      return (
        <svg {...common}>
          <rect x="1" y="7" width="13" height="10" rx="1" />
          <path d="M14 10h4l3 3v4h-7z" />
          <circle cx="6" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="3" x2="8" y2="7" />
          <line x1="16" y1="3" x2="16" y2="7" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <line x1="12" y1="13" x2="12" y2="21" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      );
  }
}

export function PreviewShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Desktop sidebar */}
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 flex-col gap-1 border-r-2 border-zinc-900 bg-zinc-900 px-3 py-5 md:flex">
          <div className="mb-6 flex items-center gap-2.5 px-2">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-orange-500 text-base font-black text-zinc-950">
              M
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-white">Mobi Ops</p>
              <p className="text-[11px] text-zinc-400">Mobi Dumpsters LLC</p>
            </div>
          </div>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={
                item.label === active
                  ? "flex items-center gap-3 rounded bg-orange-500 px-3 py-3 text-sm font-bold text-zinc-950"
                  : "flex items-center gap-3 rounded px-3 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/10"
              }
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </a>
          ))}
          <div className="mt-auto rounded border-2 border-zinc-700 px-3 py-2.5 text-xs text-zinc-400">
            <p className="font-bold text-zinc-100">Chase Vann</p>
            <p>Owner</p>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-zinc-900 bg-zinc-900 px-4 py-3 md:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-orange-500 text-sm font-black text-zinc-950">
                M
              </div>
              <p className="text-sm font-bold text-white">Mobi Ops</p>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 md:px-8 md:py-8 md:pb-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile bottom tab bar — reachable one-handed, no drawer to open */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-zinc-900 bg-zinc-900 md:hidden">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={
              item.label === active
                ? "flex flex-col items-center gap-1 py-2.5 text-orange-500"
                : "flex flex-col items-center gap-1 py-2.5 text-zinc-400"
            }
          >
            <NavIcon icon={item.icon} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
