"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, IMPERSONATION_COOKIE } from "@/lib/session";
import { logAction } from "@/lib/auditLog";
import { ADD_ON_KEYS, serializeAddOns } from "@/lib/addOns";

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

// Grants or revokes cross-organization support access for a specific user.
// Only an existing platform admin can do this — being "owner" of some
// organization isn't enough, since /signup lets anyone create their own
// organization and become its owner, which would otherwise let any
// self-signed-up account promote itself and then impersonate every other
// tenant. The very first platform admin has to be set directly in the
// database; this action can't bootstrap one.
export async function setPlatformAdmin(userId: string, isPlatformAdmin: boolean) {
  await requirePlatformAdmin();

  await db.user.update({ where: { id: userId }, data: { isPlatformAdmin } });
  await logAction(
    isPlatformAdmin ? "user.platform_admin_granted" : "user.platform_admin_revoked",
    "User",
    userId
  );
  revalidatePath("/settings");
}

// Switches a business's paid add-ons on or off (checkbox form on the
// Platform Admin page). Only platform admins can do this — a business can't
// grant itself an add-on it hasn't bought.
export async function setOrganizationAddOns(organizationId: string, formData: FormData) {
  await requirePlatformAdmin();
  const chosen = ADD_ON_KEYS.filter((key) => formData.get(`addOn_${key}`) === "on");
  const org = await db.organization.update({
    where: { id: organizationId },
    data: { enabledAddOns: serializeAddOns(chosen) },
  });
  await logAction("platform_admin.add_ons_changed", "Organization", org.id);
  revalidatePath("/platform-admin");
}
