// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
import { PreviewShell } from "../_shared";

export const dynamic = "force-static";

const links = [
  { label: "Reports", desc: "Profit & expense summary", href: "/design-preview/v2/reports", icon: "chart" },
  { label: "Settings", desc: "Branding, staff, notifications", href: "/design-preview/v2/settings", icon: "gear" },
  { label: "Customers", desc: "Browse and manage customers", href: "/design-preview/v2", icon: "users" },
  { label: "Invoices", desc: "Billing and payments", href: "/design-preview/v2", icon: "invoice" },
];

function LinkIcon({ icon }: { icon: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "h-6 w-6" };
  switch (icon) {
    case "chart":
      return (
        <svg {...common}>
          <line x1="4" y1="20" x2="20" y2="20" />
          <rect x="6" y="12" width="3" height="8" />
          <rect x="11" y="7" width="3" height="13" />
          <rect x="16" y="3" width="3" height="17" />
        </svg>
      );
    case "gear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
          <circle cx="18" cy="9" r="2.5" />
          <path d="M15 14.5c2.8.3 5 2.3 5 5.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <line x1="7" y1="9" x2="17" y2="9" />
          <line x1="7" y1="13" x2="14" y2="13" />
        </svg>
      );
  }
}

export default function DesignPreviewV2MorePage() {
  return (
    <PreviewShell active="More">
      <h1 className="text-3xl font-black tracking-tight">More</h1>
      <p className="mt-1 text-sm font-medium text-zinc-500">Everything else, one tap away.</p>

      <div className="mt-5 flex flex-col gap-3">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="flex items-center gap-4 rounded border-2 border-zinc-900 bg-white p-4 hover:bg-zinc-50"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded bg-zinc-900 text-white">
              <LinkIcon icon={l.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900">{l.label}</p>
              <p className="text-xs font-medium text-zinc-500">{l.desc}</p>
            </div>
            <span className="text-zinc-400">→</span>
          </a>
        ))}
      </div>
    </PreviewShell>
  );
}
