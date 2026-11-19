"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { OrgBranding } from "@/lib/orgBranding";
import { ThemeToggle } from "./ThemeToggle";
import { useUnsavedChanges } from "./UnsavedChangesProvider";
import { logout } from "@/app/login/actions";
import { FOOTER_LINKS, entryIsActive, type NavEntry } from "@/lib/navigation";

// The highest-frequency screens for someone checking the app one-handed in a
// truck, always reachable without opening the full menu — everything else
// lives one tap away behind "More". Deliberately fixed (not reorderable) so
// the bottom bar stays predictable. Each is looked up among the visible tabs,
// so a person who can't open one simply doesn't get it.
const PRIMARY_MOBILE_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/bookings", label: "Bookings" },
  { href: "/driver", label: "Driver" },
];

// V2: the sidebar was regrouped into hubs, so old saved orders no longer apply.
const ORDER_STORAGE_KEY = "sidebarOrderV2";

// Always dark regardless of the light/dark content toggle — bg-zinc-950
// isn't one of the shades the app's dark-mode CSS variables override (see
// globals.css), so it stays this same charcoal in both themes. That mirrors
// how the old sidebar's branding.primaryColor background also ignored the
// content theme toggle; the nav shell is chrome, not content.
const SHELL_BG = "bg-[var(--app-sidebar)]";

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

// Applies a saved id order to the visible entries, appending any that aren't
// in the saved order yet (an entry added since, or a permission just granted)
// so nav items never silently disappear.
function applyOrder(available: NavEntry[], savedOrder: string[]): NavEntry[] {
  if (savedOrder.length === 0) return available;
  const byId = new Map(available.map((entry) => [entry.id, entry]));
  const ordered = savedOrder.map((id) => byId.get(id)).filter((entry): entry is NavEntry => Boolean(entry));
  const missing = available.filter((entry) => !savedOrder.includes(entry.id));
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
        className="flex h-8 w-8 items-center justify-center rounded text-on-brand/80 hover:bg-on-brand/10 disabled:opacity-30"
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
        className="flex h-8 w-8 items-center justify-center rounded text-on-brand/80 hover:bg-on-brand/10 disabled:opacity-30"
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
  links: NavEntry[];
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
  reordering: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link, index) => {
        const isActive = entryIsActive(link, pathname);
        const rowClass = `flex items-center justify-between rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors ${
          isActive && !reordering
            ? "bg-on-brand/15 text-on-brand"
            : "text-on-brand/80 hover:bg-on-brand/10 hover:text-on-brand"
        }`;

        const label = (
          <>
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  isActive && !reordering ? "bg-accent" : "bg-on-brand/25"
                }`}
              />
              {link.label}
            </span>
            {link.id === "bookings" && pendingCount > 0 && !reordering && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-black text-accent-ink">
                {pendingCount}
              </span>
            )}
          </>
        );

        if (reordering) {
          return (
            <div key={link.id} className="contents">
                            <div className={rowClass}>
                {label}
                <MoveArrows
                  onMoveUp={() => onMove(index, -1)}
                  onMoveDown={() => onMove(index, 1)}
                  disableUp={index === 0}
                  disableDown={index === links.length - 1}
                />
              </div>
            </div>
          );
        }

        return (
          <div key={link.id} className="contents">
                        <Link href={link.href} onClick={onNavigate} className={rowClass}>
              {label}
            </Link>
          </div>
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

function FooterLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-2">
      {FOOTER_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className="py-1.5 text-xs font-bold text-on-brand/60 hover:text-on-brand"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function AccountRow({ user }: { user: SidebarUser }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-on-brand/10 px-5 py-3 text-sm text-on-brand/90">
      <Link href="/account" className="min-w-0 hover:underline">
        <div className="truncate font-bold">{user.name}</div>
        <div className="text-xs font-semibold capitalize text-on-brand/50">{user.role}</div>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="flex-shrink-0 rounded px-2.5 py-1.5 text-xs font-bold text-on-brand/70 hover:bg-on-brand/10 hover:text-on-brand"
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
  if (href === "/driver") {
    return (
      <svg {...common}>
        <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
        <circle cx="12" cy="11" r="2.2" />
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
  links: NavEntry[];
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
      <aside className={`absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col gap-6 overflow-y-auto border-r border-on-brand/10 ${SHELL_BG} px-4 py-6 shadow-2xl`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            {logo}
            <span className="text-base font-bold leading-tight text-on-brand">{branding.businessName}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-on-brand hover:bg-on-brand/10" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-on-brand hover:bg-on-brand/10"
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
          className="self-start rounded px-3 py-1.5 text-xs font-bold text-on-brand/70 hover:bg-on-brand/10 hover:text-on-brand"
        />
        <NavLinks
          links={links}
          pathname={pathname}
          pendingCount={pendingCount}
          onNavigate={reordering ? undefined : onClose}
          reordering={reordering}
          onMove={onMove}
        />
        <div className="mt-auto flex flex-col gap-2">
          <FooterLinks onNavigate={onClose} />
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
  entries,
}: {
  branding: OrgBranding;
  pendingCount?: number;
  user: SidebarUser;
  entries: NavEntry[];
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const availableLinks = entries;
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
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next.map((l) => l.id)));
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

  const visibleHrefs = new Set(entries.flatMap((entry) => entry.tabs.map((tab) => tab.href)));
  const mobileTabs = PRIMARY_MOBILE_LINKS.filter((link) => visibleHrefs.has(link.href));

  return (
    <>
      {/* Mobile top bar — sticky, so the back button stays reachable without
          scrolling back up on long pages. */}
      <header className={`print:hidden sticky top-0 z-40 flex items-center justify-between border-b border-on-brand/10 ${SHELL_BG} px-4 py-3 md:hidden`}>
        {pathname === "/" ? (
          <Link href="/" className="flex items-center gap-2.5">
            {logo}
            <span className="text-base font-bold leading-tight text-on-brand">{branding.businessName}</span>
          </Link>
        ) : (
          <BackButton className="-ml-2 flex items-center gap-1.5 rounded px-2 py-1.5 text-base font-bold text-on-brand hover:bg-on-brand/10" />
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
      <nav className={`print:hidden fixed inset-x-0 bottom-0 z-40 grid border-t border-on-brand/10 ${SHELL_BG} md:hidden`} style={{ gridTemplateColumns: `repeat(${mobileTabs.length + 1}, minmax(0, 1fr))` }}>
        {mobileTabs.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-col items-center gap-1 py-2.5 ${isActive ? "text-accent" : "text-on-brand/60"}`}
            >
              <TabIcon href={link.href} />
              {link.href === "/bookings" && pendingCount > 0 && (
                <span className="absolute right-[28%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-accent-ink">
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
          className="flex flex-col items-center gap-1 py-2.5 text-on-brand/60"
        >
          <TabIcon href="more" />
          <span className="text-[10px] font-bold">More</span>
        </button>
      </nav>

      {/* Desktop / tablet persistent sidebar */}
      <aside className={`print:hidden sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col gap-6 overflow-y-auto border-r border-on-brand/10 ${SHELL_BG} px-4 py-6 md:flex`}>
        <Link href="/" className="flex items-center gap-3 px-2">
          {logo}
          <span className="text-lg font-bold leading-tight text-on-brand">{branding.businessName}</span>
        </Link>
        {pathname !== "/" && (
          <BackButton className="-mt-4 flex items-center gap-1.5 self-start rounded px-2 py-1.5 text-sm font-bold text-on-brand/80 hover:bg-on-brand/10 hover:text-on-brand" />
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
            className="self-start rounded px-2 py-1 text-xs font-bold text-on-brand/70 hover:bg-on-brand/10 hover:text-on-brand"
          />
          <div className="flex items-center justify-between rounded-xl border border-on-brand/10 px-5 py-3 text-sm font-bold text-on-brand/90">
            Theme
            <ThemeToggle className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-on-brand hover:bg-on-brand/10" />
          </div>
          <FooterLinks />
          <AccountRow user={user} />
        </div>
      </aside>
    </>
  );
}
