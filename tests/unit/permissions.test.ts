import { describe, expect, it } from "vitest";
import { hasPermission, hasPlan, type SessionUser } from "@/lib/session";

// Pure functions, no DB — a real request-context session never looks
// exactly like this, but hasPermission/hasPlan only ever read these
// fields, so a plain object is a faithful stand-in.
function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: "staff",
    active: true,
    emailVerifiedAt: null,
    organizationId: "org-1",
    effectiveOrganizationId: "org-1",
    impersonating: null,
    isPlatformAdmin: false,
    canManageInvoices: false,
    canDeleteRecords: false,
    canManageExpenses: false,
    canViewReports: false,
    canManageLeads: false,
    canManageTime: false,
    isDriverOnly: false,
    hourlyRate: null,
    plan: "solo",
    ...overrides,
  };
}

describe("hasPermission", () => {
  it("grants an owner every permission regardless of individual flags", () => {
    const owner = makeUser({ role: "owner", canManageInvoices: false, canDeleteRecords: false });
    expect(hasPermission(owner, "canManageInvoices")).toBe(true);
    expect(hasPermission(owner, "canDeleteRecords")).toBe(true);
  });

  it("denies staff a permission their flag doesn't grant", () => {
    const staff = makeUser({ role: "staff", canDeleteRecords: false });
    expect(hasPermission(staff, "canDeleteRecords")).toBe(false);
  });

  it("grants staff exactly the permission their flag turns on, nothing else", () => {
    const staff = makeUser({ role: "staff", canManageInvoices: true, canDeleteRecords: false });
    expect(hasPermission(staff, "canManageInvoices")).toBe(true);
    expect(hasPermission(staff, "canDeleteRecords")).toBe(false);
  });
});

describe("hasPlan", () => {
  it("ranks solo < team < pro", () => {
    expect(hasPlan(makeUser({ plan: "solo" }), "team")).toBe(false);
    expect(hasPlan(makeUser({ plan: "team" }), "team")).toBe(true);
    expect(hasPlan(makeUser({ plan: "team" }), "pro")).toBe(false);
    expect(hasPlan(makeUser({ plan: "pro" }), "team")).toBe(true);
    expect(hasPlan(makeUser({ plan: "pro" }), "pro")).toBe(true);
  });
});
