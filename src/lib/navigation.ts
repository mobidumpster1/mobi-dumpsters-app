// The admin app's navigation, in one place.
//
// The sidebar, the phone menu and the tab bar at the top of each page all
// read from here, so "who can see what" is decided once. (Before this, the
// sidebar had its own copy of the plan/permission rules and each page had
// another, so a link could show up and then bounce you home.)
//
// Pages themselves still enforce their own access — this only decides what
// is *shown*.
//
// Deliberately not "server-only": the sidebar is a client component and
// needs the types and the match helpers.

export type NavUser = {
  role: string;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canManageLeads: boolean;
  isPlatformAdmin: boolean;
  // solo | team | pro
  plan: string;
};

export type NavTab = {
  href: string;
  label: string;
  // Other paths that belong to this tab (its own sub-pages), so the tab bar
  // stays visible and this tab stays highlighted while you're on them.
  also?: string[];
  // True when the page has its own separate layout (no sidebar), so the
  // link takes you out of the main app.
  external?: boolean;
};

export type NavHub = {
  id: string;
  label: string;
  tabs: NavTab[];
  // Only shown when this paid add-on is switched on (see lib/addOns.ts).
  addOn?: string;
};

export type NavEntry = {
  id: string;
  label: string;
  // Where the sidebar link goes: the first tab this person is allowed to see.
  href: string;
  // Visible tabs (empty for a plain single-page entry).
  tabs: NavTab[];
};

const PLAN_RANK: Record<string, number> = { solo: 0, team: 1, pro: 2 };
function planAtLeast(plan: string, min: "team" | "pro"): boolean {
  return (PLAN_RANK[plan] ?? 0) >= PLAN_RANK[min];
}

// Owner sees everything a staff permission would gate. Staff see everything
// except the owner-only pages and whatever they haven't been individually
// granted. Plan gating then applies to everyone including the owner (a Solo
// owner doesn't get Team/Pro features just by being the owner). Platform
// Admin is separate from both: a cross-business support capability.
export function canSeeHref(href: string, user: NavUser): boolean {
  const isOwner = user.role === "owner";
  if (!isOwner) {
    if (href === "/settings" || href === "/automation" || href === "/website-builder") return false;
    if (href === "/reports" || href === "/marketing" || href === "/documents") {
      if (!user.canViewReports) return false;
    }
    if (href === "/leads" || href === "/prospecting") {
      if (!user.canManageLeads) return false;
    }
    if (href === "/expenses" && !user.canManageExpenses) return false;
  }
  if (href === "/leads" || href === "/quotes" || href === "/reports" || href === "/website-builder") {
    if (!planAtLeast(user.plan, "team")) return false;
  }
  if (href === "/time" || href === "/reviews" || href === "/automation" || href === "/marketing") {
    if (!planAtLeast(user.plan, "pro")) return false;
  }
  if (href === "/platform-admin") return user.isPlatformAdmin;
  return true;
}

// Every top-level sidebar entry, in default order. An entry with one tab is
// a plain link; with several it's a "hub" whose tabs show along the top of
// its pages.
export const NAV: NavHub[] = [
  {
    id: "dispatch",
    label: "Dispatch",
    tabs: [
      { href: "/", label: "Today" },
      { href: "/calendar", label: "Calendar" },
      { href: "/driver", label: "Driver View", external: true },
      { href: "/time", label: "Track Time" },
    ],
  },
  {
    id: "bookings",
    label: "Bookings",
    tabs: [
      { href: "/bookings", label: "Bookings" },
      { href: "/quotes", label: "Quotes" },
      { href: "/agreements", label: "Agreements" },
      { href: "/demolition-agreements", label: "Demolition" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    tabs: [
      { href: "/customers", label: "Customers", also: ["/customers/winback"] },
      { href: "/leads", label: "Leads" },
      { href: "/prospecting", label: "Prospecting", external: true },
    ],
  },
  {
    id: "fleet",
    label: "Fleet",
    tabs: [
      {
        href: "/equipment",
        label: "Equipment",
        also: ["/equipment/categories", "/equipment/locations", "/equipment/tracking"],
      },
      { href: "/maintenance", label: "Maintenance" },
      { href: "/mileage", label: "Mileage" },
      { href: "/documents", label: "Documents" },
      { href: "/gallery", label: "Photos" },
    ],
  },
  {
    id: "money",
    label: "Money",
    tabs: [
      { href: "/invoices", label: "Invoices" },
      { href: "/invoices/unpaid", label: "Who Owes Me" },
      { href: "/expenses", label: "Expenses", also: ["/expenses/recurring"] },
      { href: "/reports", label: "Reports" },
    ],
  },
  {
    id: "growth",
    label: "Growth",
    tabs: [
      { href: "/reviews", label: "Reviews" },
      { href: "/marketing", label: "Marketing" },
      { href: "/promotions", label: "Promotions" },
      { href: "/automation", label: "Automation" },
    ],
  },
  { id: "website-builder", label: "Website Builder", tabs: [{ href: "/website-builder", label: "Website Builder" }] },
  {
    id: "secretary",
    label: "Secretary",
    addOn: "secretary",
    tabs: [{ href: "/secretary", label: "Secretary", also: ["/secretary/memory"] }],
  },
  { id: "settings", label: "Settings", tabs: [{ href: "/settings", label: "Settings" }] },
  { id: "platform-admin", label: "Platform Admin", tabs: [{ href: "/platform-admin", label: "Platform Admin" }] },
];

// Small footer links (not worth a sidebar slot). Activity Log is visible to
// staff today, so it can't live inside owner-only Settings.
export const FOOTER_LINKS: { href: string; label: string }[] = [{ href: "/activity", label: "Activity Log" }];

// The entries this person should see: tabs they can't open are dropped, an
// entry whose tabs are all dropped disappears, and the sidebar link points
// at the first tab they can open (so someone with only Invoices lands on
// /invoices, not a page that bounces them home).
export function entriesForUser(user: NavUser, addOns: readonly string[] = []): NavEntry[] {
  const out: NavEntry[] = [];
  for (const hub of NAV) {
    if (hub.addOn && !addOns.includes(hub.addOn)) continue;
    const tabs = hub.tabs.filter((tab) => canSeeHref(tab.href, user));
    if (tabs.length === 0) continue;
    out.push({ id: hub.id, label: hub.label, href: tabs[0].href, tabs });
  }
  return out;
}

export function pathMatches(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Does this entry own the current page? Used for sidebar highlighting.
export function entryIsActive(entry: NavEntry, pathname: string): boolean {
  return entry.tabs.some(
    (tab) => pathMatches(pathname, tab.href) || (tab.also ?? []).some((p) => pathMatches(pathname, p))
  );
}

// The tab to highlight for the current page, but only when the page is one
// of the tab pages themselves (not a booking's detail page, etc. — a tab bar
// on those would just be clutter).
export function activeTabFor(entry: NavEntry, pathname: string): NavTab | null {
  const exact = entry.tabs.find(
    (tab) => pathname === tab.href || (tab.also ?? []).includes(pathname)
  );
  return exact ?? null;
}
