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
  canManageInvoices: true,
  canDeleteRecords: true,
  canManageExpenses: true,
  canViewReports: true,
  canManageLeads: true,
} as const;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
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

  return user;
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
