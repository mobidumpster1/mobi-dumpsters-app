"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, IMPERSONATION_COOKIE } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

async function requirePlatformAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isPlatformAdmin) {
    throw new Error("Only platform admins can do this.");
  }
  return user;
}

// Starts a support session viewing another organization's data. Short-
// lived on purpose (4 hours) — support access shouldn't quietly persist
// the way a normal 30-day login does. Logged under the admin's own real
// identity, not the organization being viewed, so it's always clear who
// actually did this.
export async function startImpersonation(organizationId: string) {
  await requirePlatformAdmin();

  const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId } });

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, org.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  await logAction("platform_admin.impersonation_started", "Organization", org.id);
  redirect("/");
}

export async function stopImpersonation() {
  const user = await requirePlatformAdmin();

  const cookieStore = await cookies();
  const impersonatedOrgId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  cookieStore.delete(IMPERSONATION_COOKIE);

  if (impersonatedOrgId) {
    await logAction("platform_admin.impersonation_stopped", "Organization", impersonatedOrgId);
  }

  revalidatePath("/");
  redirect("/");
}

// Owner-only, mirrors the pattern in settings/staffActions.ts — grants or
// revokes cross-organization support access for a specific user. Never
// self-service: a platform admin can't grant themselves this (they'd
// already need it to reach this action), and it's deliberately separate
// from the five regular per-organization permission flags.
export async function setPlatformAdmin(userId: string, isPlatformAdmin: boolean) {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") {
    throw new Error("Only the owner can grant platform admin access.");
  }

  await db.user.update({ where: { id: userId }, data: { isPlatformAdmin } });
  await logAction(
    isPlatformAdmin ? "user.platform_admin_granted" : "user.platform_admin_revoked",
    "User",
    userId
  );
  revalidatePath("/settings");
}
