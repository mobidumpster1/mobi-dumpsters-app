import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PERMISSION_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  emailVerifiedAt: true,
  organizationId: true,
  isPlatformAdmin: true,
  canManageInvoices: true,
  canDeleteRecords: true,
  canManageExpenses: true,
  canViewReports: true,
  canManageLeads: true,
  canManageTime: true,
  hourlyRate: true,
  organization: { select: { plan: true } },
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
  emailVerifiedAt: Date | null;
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
  // Edit/delete other staff's time entries (self-clock needs no
  // permission at all — anyone can log their own time).
  canManageTime: boolean;
  hourlyRate: number | null;
  // The subscription tier of whichever org is effectively being viewed
  // (the impersonated org's plan during platform-admin support access,
  // same as effectiveOrganizationId) — solo | team | pro.
  plan: string;
};

export type Permission =
  | "canManageInvoices"
  | "canDeleteRecords"
  | "canManageExpenses"
  | "canViewReports"
  | "canManageLeads"
  | "canManageTime";

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

  const { organization, ...userFields } = user;

  let effectiveOrganizationId = user.organizationId;
  let plan = organization.plan;
  let impersonating: { id: string; name: string } | null = null;

  // Only a platform admin's session ever looks at this cookie — anyone
  // else's copy of it (however it got there) is simply ignored.
  if (user.isPlatformAdmin) {
    const impersonatedOrgId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
    if (impersonatedOrgId && impersonatedOrgId !== user.organizationId) {
      const org = await db.organization.findUnique({
        where: { id: impersonatedOrgId },
        select: { id: true, name: true, plan: true },
      });
      if (org) {
        effectiveOrganizationId = org.id;
        plan = org.plan;
        impersonating = { id: org.id, name: org.name };
      }
    }
  }

  return { ...userFields, effectiveOrganizationId, plan, impersonating };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// For public, unauthenticated routes (the online booking form, a standalone
// agreement-signing link) that need to create a record but have no session
// to read an organizationId from. Every install today has exactly one
// organization, so this is safe — but it's a placeholder: once a second
// business is actually onboarded, these public routes will need their own
// way to know which organization they belong to (e.g. a slug or subdomain
// in the URL), and this function should be replaced at each call site.
// Public pages (/book, /agreement/sign) have no logged-in session, so
// there's no organizationId to read off a user — this figures out whose
// booking page is being viewed from the request's hostname instead (each
// org sets its own custom domain in Settings, e.g.
// "book.mobidumpsters.com"). Falls back to whichever org was created
// first when the hostname isn't recognized — the raw *.vercel.app URL,
// localhost, or a domain that hasn't been added yet — so nothing breaks
// before an org has a domain configured.
export async function getPublicOrganizationId(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0]?.toLowerCase();

  if (host) {
    const matched = await db.organization.findUnique({
      where: { publicDomain: host },
      select: { id: true },
    });
    if (matched) return matched.id;
  }

  const org = await db.organization.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  return org.id;
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

const PLAN_RANK: Record<string, number> = { solo: 0, team: 1, pro: 2 };

export function hasPlan(user: SessionUser, minPlan: "team" | "pro"): boolean {
  return (PLAN_RANK[user.plan] ?? 0) >= PLAN_RANK[minPlan];
}

const PLAN_LABELS: Record<"team" | "pro", string> = { team: "Team", pro: "Pro" };

// Synchronous check against a SessionUser already in hand (e.g. one just
// returned by requirePermission) — avoids a redundant requireUser() DB
// round-trip when an action already guards by permission and just needs
// to add a plan check alongside it.
export function requirePlanFor(user: SessionUser, minPlan: "team" | "pro"): void {
  if (!hasPlan(user, minPlan)) {
    throw new Error(
      `This feature needs the ${PLAN_LABELS[minPlan]} plan or higher — upgrade in Settings → Billing.`
    );
  }
}

// Same shape as requirePermission — first line of an action, throws rather
// than redirecting. Gates a feature by subscription tier instead of a
// staff permission flag. Use requirePlanFor instead when a SessionUser is
// already available, to skip a second DB lookup.
export async function requirePlan(minPlan: "team" | "pro"): Promise<SessionUser> {
  const user = await requireUser();
  requirePlanFor(user, minPlan);
  return user;
}
