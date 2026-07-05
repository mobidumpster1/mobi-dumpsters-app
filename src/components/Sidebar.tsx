"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { branding } from "@/lib/branding";

const links = [
  { href: "/", label: "Dispatch" },
  { href: "/calendar", label: "Calendar" },
  { href: "/customers", label: "Customers" },
  { href: "/equipment", label: "Equipment" },
  { href: "/bookings", label: "Bookings" },
  { href: "/invoices", label: "Invoices" },
  { href: "/agreements", label: "Agreements" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({
  logoExists,
  pendingCount = 0,
}: {
  logoExists: boolean;
  pendingCount?: number;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="sticky top-0 flex h-screen w-60 flex-shrink-0 flex-col gap-6 overflow-y-auto px-4 py-6 shadow-sm"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <Link href="/" className="flex items-center gap-3 px-2">
        {logoExists && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logoPath}
            alt={branding.businessName}
            className="h-11 w-11 flex-shrink-0 rounded-xl bg-white object-contain p-1"
          />
        )}
        <span className="text-lg font-semibold leading-tight text-white">
          {branding.businessName}
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between rounded-xl px-5 py-4 text-base font-medium transition-colors ${
                isActive
                  ? "bg-white text-brand-dark"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
              {link.href === "/bookings" && pendingCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
