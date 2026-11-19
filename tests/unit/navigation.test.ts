import { describe, expect, it } from "vitest";
import { activeTabFor, entriesForUser, entryIsActive, type NavUser } from "@/lib/navigation";

const owner = (plan: string): NavUser => ({
  role: "owner",
  canManageExpenses: true,
  canViewReports: true,
  canManageLeads: true,
  isPlatformAdmin: false,
  plan,
});
const staff = (over: Partial<NavUser> = {}): NavUser => ({
  role: "staff",
  canManageExpenses: false,
  canViewReports: false,
  canManageLeads: false,
  isPlatformAdmin: false,
  plan: "pro",
  ...over,
});

const ids = (u: NavUser, addOns: string[] = []) => entriesForUser(u, addOns).map((e) => e.id);
const tabHrefs = (u: NavUser, id: string) =>
  entriesForUser(u)
    .find((e) => e.id === id)
    ?.tabs.map((t) => t.href) ?? [];

describe("navigation", () => {
  it("a Pro owner gets the eight core entries, and Secretary only with its add-on", () => {
    const core = ["dispatch", "bookings", "customers", "fleet", "money", "growth", "website-builder", "settings"];
    expect(ids(owner("pro"))).toEqual(core);
    expect(ids(owner("pro"), ["secretary"])).toEqual([
      "dispatch",
      "bookings",
      "customers",
      "fleet",
      "money",
      "growth",
      "website-builder",
      "secretary",
      "settings",
    ]);
    // An add-on the business has not bought never shows, whatever their plan.
    expect(ids(owner("solo"), ["phone-agent"])).not.toContain("secretary");
  });

  it("a Solo owner loses Team/Pro-only tabs and any group left empty", () => {
    const u = owner("solo");
    expect(tabHrefs(u, "dispatch")).toEqual(["/", "/calendar", "/driver"]); // no Track Time
    expect(tabHrefs(u, "bookings")).not.toContain("/quotes");
    expect(tabHrefs(u, "customers")).not.toContain("/leads");
    expect(tabHrefs(u, "money")).not.toContain("/reports");
    expect(ids(u)).not.toContain("website-builder");
  });

  it("keeps Promotions reachable on Solo (it is not plan-gated)", () => {
    expect(tabHrefs(owner("solo"), "growth")).toEqual(["/promotions"]);
  });

  it("staff never see owner-only pages and need grants for gated ones", () => {
    const none = staff();
    expect(ids(none)).not.toContain("settings");
    expect(ids(none)).not.toContain("website-builder");
    expect(tabHrefs(none, "money")).toEqual(["/invoices", "/invoices/unpaid"]);
    expect(tabHrefs(none, "fleet")).not.toContain("/documents");
    expect(tabHrefs(none, "customers")).toEqual(["/customers"]);

    const granted = staff({ canManageExpenses: true, canViewReports: true, canManageLeads: true });
    expect(tabHrefs(granted, "money")).toContain("/expenses");
    expect(tabHrefs(granted, "money")).toContain("/reports");
    expect(tabHrefs(granted, "customers")).toContain("/leads");
  });

  it("an entry links to the first tab the person can actually open", () => {
    const e = entriesForUser(staff()).find((x) => x.id === "money");
    expect(e?.href).toBe("/invoices");
    // Staff without Documents access: Fleet should still open on Equipment.
    expect(entriesForUser(staff()).find((x) => x.id === "fleet")?.href).toBe("/equipment");
  });

  it("only platform admins get Platform Admin", () => {
    expect(ids(owner("pro"))).not.toContain("platform-admin");
    expect(ids({ ...owner("pro"), isPlatformAdmin: true })).toContain("platform-admin");
  });

  it("highlights the right entry, including sub-pages and detail pages", () => {
    const entries = entriesForUser(owner("pro"), ["secretary"]);
    const find = (id: string) => entries.find((e) => e.id === id)!;
    expect(entryIsActive(find("dispatch"), "/")).toBe(true);
    expect(entryIsActive(find("dispatch"), "/bookings")).toBe(false);
    expect(entryIsActive(find("fleet"), "/equipment/categories")).toBe(true);
    expect(entryIsActive(find("fleet"), "/mileage")).toBe(true);
    expect(entryIsActive(find("bookings"), "/bookings/abc123")).toBe(true);
    expect(entryIsActive(find("money"), "/invoices/unpaid")).toBe(true);
    expect(entryIsActive(find("secretary"), "/secretary/memory")).toBe(true);
  });

  it("shows the tab bar only on the tab pages, not on detail pages", () => {
    const money = entriesForUser(owner("pro")).find((e) => e.id === "money")!;
    expect(activeTabFor(money, "/invoices")?.href).toBe("/invoices");
    expect(activeTabFor(money, "/invoices/unpaid")?.href).toBe("/invoices/unpaid");
    expect(activeTabFor(money, "/invoices/abc123")).toBeNull();
    const fleet = entriesForUser(owner("pro")).find((e) => e.id === "fleet")!;
    expect(activeTabFor(fleet, "/equipment/locations")?.href).toBe("/equipment");
  });
});
