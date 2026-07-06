"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { branding } from "@/lib/branding";
import { ThemeToggle } from "./ThemeToggle";

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

function NavLinks({
  pathname,
  pendingCount,
  onNavigate,
}: {
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
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
  );
}

export function Sidebar({
  logoExists,
  pendingCount = 0,
}: {
  logoExists: boolean;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const logo = logoExists && (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={branding.logoPath}
      alt={branding.businessName}
      className="h-11 w-11 flex-shrink-0 rounded-xl bg-white object-contain p-1"
    />
  );

  return (
    <>
      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 shadow-sm md:hidden"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          {logo}
          <span className="text-base font-semibold leading-tight text-white">
            {branding.businessName}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col gap-6 overflow-y-auto px-4 py-6 shadow-lg"
            style={{ backgroundColor: branding.primaryColor }}
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5">
                {logo}
                <span className="text-base font-semibold leading-tight text-white">
                  {branding.businessName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <NavLinks
              pathname={pathname}
              pendingCount={pendingCount}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Desktop / tablet persistent sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col gap-6 overflow-y-auto px-4 py-6 shadow-sm md:flex"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <Link href="/" className="flex items-center gap-3 px-2">
          {logo}
          <span className="text-lg font-semibold leading-tight text-white">
            {branding.businessName}
          </span>
        </Link>
        <NavLinks pathname={pathname} pendingCount={pendingCount} />
        <div className="mt-auto flex items-center justify-between rounded-xl px-5 py-3 text-sm font-medium text-white/90">
          Theme
          <ThemeToggle className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10" />
        </div>
      </aside>
    </>
  );
}
