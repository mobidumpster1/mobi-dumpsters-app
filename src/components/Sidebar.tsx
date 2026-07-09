"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { branding } from "@/lib/branding";
import { ThemeToggle } from "./ThemeToggle";
import { logout } from "@/app/login/actions";

const DEFAULT_LINKS = [
  { href: "/", label: "Dispatch" },
  { href: "/calendar", label: "Calendar" },
  { href: "/customers", label: "Customers" },
  { href: "/leads", label: "Leads" },
  { href: "/equipment", label: "Equipment" },
  { href: "/mileage", label: "Mileage" },
  { href: "/bookings", label: "Bookings" },
  { href: "/invoices", label: "Invoices" },
  { href: "/agreements", label: "Agreements" },
  { href: "/gallery", label: "Gallery" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

const ORDER_STORAGE_KEY = "sidebarOrder";

export type SidebarUser = {
  name: string;
  email: string;
  role: string;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canManageLeads: boolean;
};

// Owner sees everything. Staff see everything except Settings (never
// togglable — it's how permissions themselves get granted) and whatever
// they haven't been individually granted access to.
function linksForUser(user: SidebarUser): typeof DEFAULT_LINKS {
  if (user.role === "owner") return DEFAULT_LINKS;
  return DEFAULT_LINKS.filter((link) => {
    if (link.href === "/settings") return false;
    if (link.href === "/reports") return user.canViewReports;
    if (link.href === "/leads") return user.canManageLeads;
    if (link.href === "/expenses") return user.canManageExpenses;
    return true;
  });
}

// Applies a saved href order to the given link list, appending any links
// that aren't in the saved order yet (a page added since, or a permission
// just granted) so nav items never silently disappear.
function applyOrder(
  availableLinks: typeof DEFAULT_LINKS,
  savedOrder: string[]
): typeof DEFAULT_LINKS {
  if (savedOrder.length === 0) return availableLinks;
  const byHref = new Map(availableLinks.map((link) => [link.href, link]));
  const ordered = savedOrder
    .map((href) => byHref.get(href))
    .filter((link): link is (typeof DEFAULT_LINKS)[number] => Boolean(link));
  const missing = availableLinks.filter((link) => !savedOrder.includes(link.href));
  return [...ordered, ...missing];
}

function MoveArrows({
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <span className="flex flex-shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onMoveUp();
        }}
        disabled={disableUp}
        aria-label="Move up"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onMoveDown();
        }}
        disabled={disableDown}
        aria-label="Move down"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </span>
  );
}

function NavLinks({
  links,
  pathname,
  pendingCount,
  onNavigate,
  reordering,
  onMove,
}: {
  links: typeof DEFAULT_LINKS;
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
  reordering: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link, index) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const rowClass = `flex items-center justify-between rounded-xl px-5 py-4 text-base font-medium transition-colors ${
          isActive && !reordering
            ? "bg-white text-brand-dark"
            : "text-white/90 hover:bg-white/10 hover:text-white"
        }`;

        const label = (
          <>
            {link.label}
            {link.href === "/bookings" && pendingCount > 0 && !reordering && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </>
        );

        if (reordering) {
          return (
            <div key={link.href} className={rowClass}>
              {label}
              <MoveArrows
                onMoveUp={() => onMove(index, -1)}
                onMoveDown={() => onMove(index, 1)}
                disableUp={index === 0}
                disableDown={index === links.length - 1}
              />
            </div>
          );
        }

        return (
          <Link key={link.href} href={link.href} onClick={onNavigate} className={rowClass}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ReorderToggle({
  reordering,
  onToggle,
  className,
}: {
  reordering: boolean;
  onToggle: () => void;
  className: string;
}) {
  return (
    <button type="button" onClick={onToggle} className={className}>
      {reordering ? "Done" : "Reorder tabs"}
    </button>
  );
}

function AccountRow({ user }: { user: SidebarUser }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl px-5 py-3 text-sm text-white/90">
      <Link href="/account" className="min-w-0 hover:underline">
        <div className="truncate font-medium">{user.name}</div>
        <div className="text-xs capitalize text-white/60">{user.role}</div>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}

export function Sidebar({
  logoExists,
  pendingCount = 0,
  user,
}: {
  logoExists: boolean;
  pendingCount?: number;
  user: SidebarUser;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const availableLinks = linksForUser(user);
  const [links, setLinks] = useState(availableLinks);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY);
      if (saved) setLinks(applyOrder(availableLinks, JSON.parse(saved)));
    } catch {
      // localStorage unavailable or corrupt saved value — just use default order.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role]);

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function moveLink(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    const next = [...links];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setLinks(next);
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next.map((l) => l.href)));
    } catch {
      // localStorage unavailable — order just won't persist across visits.
    }
  }

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
            <ReorderToggle
              reordering={reordering}
              onToggle={() => setReordering((r) => !r)}
              className="self-start rounded-xl px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
            />
            <NavLinks
              links={links}
              pathname={pathname}
              pendingCount={pendingCount}
              onNavigate={reordering ? undefined : () => setOpen(false)}
              reordering={reordering}
              onMove={moveLink}
            />
            <div className="mt-auto">
              <AccountRow user={user} />
            </div>
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
        <NavLinks
          links={links}
          pathname={pathname}
          pendingCount={pendingCount}
          reordering={reordering}
          onMove={moveLink}
        />
        <div className="mt-auto flex flex-col gap-2">
          <ReorderToggle
            reordering={reordering}
            onToggle={() => setReordering((r) => !r)}
            className="self-start rounded-xl px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
          />
          <div className="flex items-center justify-between rounded-xl px-5 py-3 text-sm font-medium text-white/90">
            Theme
            <ThemeToggle className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10" />
          </div>
          <AccountRow user={user} />
        </div>
      </aside>
    </>
  );
}
