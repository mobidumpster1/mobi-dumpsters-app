"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { OrgBranding } from "@/lib/orgBranding";
import { ThemeToggle } from "./ThemeToggle";
import { useUnsavedChanges } from "./UnsavedChangesProvider";
import { logout } from "@/app/login/actions";

const DEFAULT_LINKS = [
  { href: "/", label: "Dispatch" },
  { href: "/calendar", label: "Calendar" },
  { href: "/customers", label: "Customers" },
  { href: "/leads", label: "Leads" },
  { href: "/quotes", label: "Quotes" },
  { href: "/equipment", label: "Equipment" },
  { href: "/mileage", label: "Mileage" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/time", label: "Track Time" },
  { href: "/reviews", label: "Reviews" },
  { href: "/automation", label: "Automation" },
  { href: "/bookings", label: "Bookings" },
  { href: "/invoices", label: "Invoices" },
  { href: "/agreements", label: "Agreements" },
  { href: "/gallery", label: "Gallery" },
  { href: "/expenses", label: "Expenses" },
  { href: "/documents", label: "Documents" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
  { href: "/platform-admin", label: "Platform Admin" },
];

// The 3 highest-frequency screens for someone checking the app one-handed
// in a truck, always reachable without opening the full nav — everything
// else (including these three, at full length) lives one tap away behind
// "More". Deliberately fixed (not reorderable) so the bottom bar stays
// predictable regardless of how someone has customized the full list.
const PRIMARY_MOBILE_LINKS = ["/", "/calendar", "/bookings"];

const ORDER_STORAGE_KEY = "sidebarOrder";

// Always dark regardless of the light/dark content toggle — bg-zinc-950
// isn't one of the shades the app's dark-mode CSS variables override (see
// globals.css), so it stays this same charcoal in both themes. That mirrors
// how the old sidebar's branding.primaryColor background also ignored the
// content theme toggle; the nav shell is chrome, not content.
const SHELL_BG = "bg-zinc-950";

export type SidebarUser = {
  name: string;
  email: string;
  role: string;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canManageLeads: boolean;
  isPlatformAdmin: boolean;
  // The effective org's subscription tier — solo | team | pro. Gates
  // Team/Pro-only features regardless of role, unlike the permission
  // flags above (which only ever restrict staff, never the owner).
  plan: string;
};

// session.ts's hasPlan() can't be imported here (it's "server-only"), so
// this is a small standalone copy of the same rank comparison.
const PLAN_RANK: Record<string, number> = { solo: 0, team: 1, pro: 2 };
function planAtLeast(plan: string, minPlan: "team" | "pro"): boolean {
  return (PLAN_RANK[plan] ?? 0) >= PLAN_RANK[minPlan];
}

// Owner sees everything a staff permission would gate. Staff see
// everything except Settings (never togglable — it's how permissions
// themselves get granted) and whatever they haven't been individually
// granted access to. Plan gating applies on top of that, to everyone
// including the owner, since a Solo-plan owner doesn't get Team/Pro
// features just by being the owner. Platform Admin is separate from both
// — it's gated purely on isPlatformAdmin, a cross-organization support
// capability rather than an in-org permission.
function linksForUser(user: SidebarUser): typeof DEFAULT_LINKS {
  const permissionFiltered = user.role === "owner"
    ? DEFAULT_LINKS
    : DEFAULT_LINKS.filter((link) => {
        if (link.href === "/settings" || link.href === "/automation") return false;
        if (link.href === "/reports") return user.canViewReports;
        if (link.href === "/documents") return user.canViewReports;
        if (link.href === "/leads") return user.canManageLeads;
        if (link.href === "/expenses") return user.canManageExpenses;
        return true;
      });
  const planFiltered = permissionFiltered.filter((link) => {
    if (link.href === "/leads" || link.href === "/quotes" || link.href === "/reports") {
      return planAtLeast(user.plan, "team");
    }
    if (link.href === "/time" || link.href === "/reviews" || link.href === "/automation") {
      return planAtLeast(user.plan, "pro");
    }
    return true;
  });
  return planFiltered.filter((link) => link.href !== "/platform-admin" || user.isPlatformAdmin);
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
        className="flex h-8 w-8 items-center justify-center rounded text-white/80 hover:bg-white/10 disabled:opacity-30"
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
        className="flex h-8 w-8 items-center justify-center rounded text-white/80 hover:bg-white/10 disabled:opacity-30"
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
        const rowClass = `flex items-center justify-between rounded px-5 py-4 text-base font-bold transition-colors ${
          isActive && !reordering
            ? "bg-brand text-white"
            : "text-white/90 hover:bg-white/10 hover:text-white"
        }`;

        const label = (
          <>
            {link.label}
            {link.href === "/bookings" && pendingCount > 0 && !reordering && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-black text-white">
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

// Reused in both the mobile sticky header and the desktop sidebar. Warns
// before discarding an unsaved edit form (see UnsavedChangesProvider)
// instead of silently losing it, per Chase's ask.
function BackButton({ className }: { className: string }) {
  const router = useRouter();
  const { isDirty, clearDirty } = useUnsavedChanges();

  function handleClick() {
    if (isDirty()) {
      const leave = window.confirm(
        "You have unsaved changes on this page. Leave without saving?"
      );
      if (!leave) return;
    }
    clearDirty();
    router.back();
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 flex-shrink-0"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}

function AccountRow({ user }: { user: SidebarUser }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border-2 border-zinc-800 px-5 py-3 text-sm text-white/90">
      <Link href="/account" className="min-w-0 hover:underline">
        <div className="truncate font-bold">{user.name}</div>
        <div className="text-xs font-semibold capitalize text-white/50">{user.role}</div>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="flex-shrink-0 rounded px-2.5 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}

function TabIcon({ href }: { href: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-6 w-6",
  };
  if (href === "/") {
    return (
      <svg {...common}>
        <rect x="1" y="7" width="13" height="10" rx="1" />
        <path d="M14 10h4l3 3v4h-7z" />
        <circle cx="6" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    );
  }
  if (href === "/calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
      </svg>
    );
  }
  if (href === "/bookings") {
    return (
      <svg {...common}>
        <rect x="5" y="3" width="14" height="18" rx="1.5" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

// The bottom tab bar's "More" tab opens the same full reorderable link
// list the drawer always had — nothing is lost, it's just reached from a
// thumb-height tab instead of a top-left hamburger.
function MoreSheet({
  branding,
  logo,
  links,
  pathname,
  pendingCount,
  reordering,
  onToggleReorder,
  onMove,
  onClose,
  user,
}: {
  branding: OrgBranding;
  logo: React.ReactNode;
  links: typeof DEFAULT_LINKS;
  pathname: string;
  pendingCount: number;
  reordering: boolean;
  onToggleReorder: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onClose: () => void;
  user: SidebarUser;
}) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className={`absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col gap-6 overflow-y-auto border-r-2 border-zinc-800 ${SHELL_BG} px-4 py-6 shadow-2xl`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            {logo}
            <span className="text-base font-bold leading-tight text-white">{branding.businessName}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-white hover:bg-white/10" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-white hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <ReorderToggle
          reordering={reordering}
          onToggle={onToggleReorder}
          className="self-start rounded px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white"
        />
        <NavLinks
          links={links}
          pathname={pathname}
          pendingCount={pendingCount}
          onNavigate={reordering ? undefined : onClose}
          reordering={reordering}
          onMove={onMove}
        />
        <div className="mt-auto">
          <AccountRow user={user} />
        </div>
      </aside>
    </div>
  );
}

export function Sidebar({
  branding,
  pendingCount = 0,
  user,
}: {
  branding: OrgBranding;
  pendingCount?: number;
  user: SidebarUser;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
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

  // Close the mobile "More" sheet automatically whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
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

  const logo = branding.logoUrl && (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={branding.logoUrl}
      alt={branding.businessName}
      className="h-9 w-9 flex-shrink-0 rounded bg-white object-contain p-1"
    />
  );

  const mobileTabs = PRIMARY_MOBILE_LINKS
    .map((href) => links.find((l) => l.href === href))
    .filter((l): l is (typeof DEFAULT_LINKS)[number] => Boolean(l));

  return (
    <>
      {/* Mobile top bar — sticky, so the back button stays reachable without
          scrolling back up on long pages. */}
      <header className={`sticky top-0 z-40 flex items-center justify-between border-b-2 border-zinc-800 ${SHELL_BG} px-4 py-3 md:hidden`}>
        {pathname === "/" ? (
          <Link href="/" className="flex items-center gap-2.5">
            {logo}
            <span className="text-base font-bold leading-tight text-white">{branding.businessName}</span>
          </Link>
        ) : (
          <BackButton className="-ml-2 flex items-center gap-1.5 rounded px-2 py-1.5 text-base font-bold text-white hover:bg-white/10" />
        )}
        <ThemeToggle />
      </header>

      {moreOpen && (
        <MoreSheet
          branding={branding}
          logo={logo}
          links={links}
          pathname={pathname}
          pendingCount={pendingCount}
          reordering={reordering}
          onToggleReorder={() => setReordering((r) => !r)}
          onMove={moveLink}
          onClose={() => setMoreOpen(false)}
          user={user}
        />
      )}

      {/* Mobile bottom tab bar — reachable one-handed, no drawer to open
          for the highest-frequency screens. */}
      <nav className={`fixed inset-x-0 bottom-0 z-40 grid border-t-2 border-zinc-800 ${SHELL_BG} md:hidden`} style={{ gridTemplateColumns: `repeat(${mobileTabs.length + 1}, minmax(0, 1fr))` }}>
        {mobileTabs.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-col items-center gap-1 py-2.5 ${isActive ? "text-brand" : "text-white/60"}`}
            >
              <TabIcon href={link.href} />
              {link.href === "/bookings" && pendingCount > 0 && (
                <span className="absolute right-[28%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                  {pendingCount}
                </span>
              )}
              <span className="text-[10px] font-bold">{link.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-white/60"
        >
          <TabIcon href="more" />
          <span className="text-[10px] font-bold">More</span>
        </button>
      </nav>

      {/* Desktop / tablet persistent sidebar */}
      <aside className={`sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col gap-6 overflow-y-auto border-r-2 border-zinc-800 ${SHELL_BG} px-4 py-6 md:flex`}>
        <Link href="/" className="flex items-center gap-3 px-2">
          {logo}
          <span className="text-lg font-bold leading-tight text-white">{branding.businessName}</span>
        </Link>
        {pathname !== "/" && (
          <BackButton className="-mt-4 flex items-center gap-1.5 self-start rounded px-2 py-1.5 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white" />
        )}
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
            className="self-start rounded px-2 py-1 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white"
          />
          <div className="flex items-center justify-between rounded border-2 border-zinc-800 px-5 py-3 text-sm font-bold text-white/90">
            Theme
            <ThemeToggle className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-white hover:bg-white/10" />
          </div>
          <AccountRow user={user} />
        </div>
      </aside>
    </>
  );
}
