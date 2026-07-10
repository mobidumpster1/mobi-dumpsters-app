import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PERMISSION_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  organizationId: true,
  isPlatformAdmin: true,
  canManageInvoices: true,
  canDeleteRecords: true,
  canManageExpenses: true,
  canViewReports: true,
  canManageLeads: true,
} as const;

// Set (only by a platform admin, via the Platform Admin page) when
// helping troubleshoot another organization. Carries no authority on its
// own — getCurrentUser() only ever honors it after confirming the real
// logged-in user is isPlatformAdmin, so a non-admin setting this cookie
// by hand has no effect.
export const IMPERSONATION_COOKIE = "mobi_impersonate_org";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  // The user's own organization — their real, permanent identity.
  // Never changes due to impersonation. Use this for "who does this
  // person actually work for," never for scoping business data.
  organizationId: string;
  // Which organization's data this request should actually see —
  // equal to organizationId normally, or the impersonated org's id
  // during platform-admin support access. Every query that scopes
  // business data (customers, bookings, invoices, etc.) should filter
  // by this field, not organizationId.
  effectiveOrganizationId: string;
  impersonating: { id: string; name: string } | null;
  isPlatformAdmin: boolean;
  canManageInvoices: boolean;
  canDeleteRecords: boolean;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canManageLeads: boolean;
};

export type Permission =
  | "canManageInvoices"
  | "canDeleteRecords"
  | "canManageExpenses"
  | "canViewReports"
  | "canManageLeads";

// Deliberately re-checks `active` against the database on every call rather
// than trusting the signed cookie alone — that's what makes deactivating a
// user actually lock them out immediately, not just once their 30-day
// cookie eventually expires.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const verified = verifySessionToken(token);
  if (!verified) return null;

  const user = await db.user.findUnique({
    where: { id: verified.userId },
    select: PERMISSION_FIELDS,
  });
  if (!user || !user.active) return null;

  let effectiveOrganizationId = user.organizationId;
  let impersonating: { id: string; name: string } | null = null;

  // Only a platform admin's session ever looks at this cookie — anyone
  // else's copy of it (however it got there) is simply ignored.
  if (user.isPlatformAdmin) {
    const impersonatedOrgId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
    if (impersonatedOrgId && impersonatedOrgId !== user.organizationId) {
      const org = await db.organization.findUnique({ where: { id: impersonatedOrgId } });
      if (org) {
        effectiveOrganizationId = org.id;
        impersonating = { id: org.id, name: org.name };
      }
    }
  }

  return { ...user, effectiveOrganizationId, impersonating };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function hasPermission(user: SessionUser, permission: Permission): boolean {
  return user.role === "owner" || user[permission];
}

// For use inside server actions guarding a sensitive mutation — throws
// (rather than redirecting) since a mutation isn't a page navigation.
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) {
    throw new Error("You don't have permission to do that.");
  }
  return user;
}
