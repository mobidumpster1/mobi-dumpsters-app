"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { hashPassword } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") {
    throw new Error("Only the owner can manage staff accounts.");
  }
  return user;
}

export async function addStaffUser(formData: FormData) {
  const owner = await requireOwner();

  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  if (!name || !email || !password) {
    throw new Error("Name, email, and a temporary password are all required.");
  }

  if (owner.plan === "solo") {
    const seatCount = await db.user.count({ where: { organizationId: owner.organizationId } });
    if (seatCount >= 1) {
      throw new Error("Solo plan is limited to 1 user — upgrade to Team in Settings → Billing to add staff.");
    }
  }

  const hourlyRateStr = str(formData, "hourlyRate");

  const newUser = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role: "staff",
      organizationId: owner.organizationId,
      hourlyRate: hourlyRateStr ? Number(hourlyRateStr) : null,
      canManageTime: formData.get("canManageTime") === "on",
      isDriverOnly: formData.get("isDriverOnly") === "on",
    },
  });

  await logAction("user.created", "User", newUser.id);
  revalidatePath("/settings");
}

const PERMISSION_KEYS = [
  "canManageInvoices",
  "canDeleteRecords",
  "canManageExpenses",
  "canViewReports",
  "canManageLeads",
  "canManageTime",
  "isDriverOnly",
] as const;

// One form per staff row submits all permission checkboxes plus the
// hourly rate at once — unchecked boxes simply aren't present in
// FormData, so each key defaults to false.
export async function updateStaffPermissions(userId: string, formData: FormData) {
  const owner = await requireOwner();

  const data: Record<string, boolean | number | null> = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, formData.get(key) === "on"])
  );

  const hourlyRateStr = str(formData, "hourlyRate");
  data.hourlyRate = hourlyRateStr ? Number(hourlyRateStr) : null;

  // Scoped to the owner's own organization — requireOwner only proves the
  // caller owns *some* organization, so an unscoped update by id would let
  // one tenant's owner change another tenant's staff given just a user id.
  const result = await db.user.updateMany({
    where: { id: userId, organizationId: owner.effectiveOrganizationId },
    data,
  });
  if (result.count === 0) throw new Error("Staff member not found.");
  await logAction("user.permissions_updated", "User", userId);
  revalidatePath("/settings");
}

export async function setStaffActive(userId: string, active: boolean) {
  const owner = await requireOwner();
  const result = await db.user.updateMany({
    where: { id: userId, organizationId: owner.effectiveOrganizationId },
    data: { active },
  });
  if (result.count === 0) throw new Error("Staff member not found.");
  await logAction(active ? "user.activated" : "user.deactivated", "User", userId);
  revalidatePath("/settings");
}
