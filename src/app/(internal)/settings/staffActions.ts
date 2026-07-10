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
  await requireOwner();

  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  if (!name || !email || !password) {
    throw new Error("Name, email, and a temporary password are all required.");
  }

  const newUser = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role: "staff",
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
] as const;

// One form per staff row submits all five checkboxes at once — unchecked
// boxes simply aren't present in FormData, so each key defaults to false.
export async function updateStaffPermissions(userId: string, formData: FormData) {
  await requireOwner();

  const data = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, formData.get(key) === "on"])
  );

  await db.user.update({ where: { id: userId }, data });
  await logAction("user.permissions_updated", "User", userId);
  revalidatePath("/settings");
}

export async function setStaffActive(userId: string, active: boolean) {
  await requireOwner();
  await db.user.update({ where: { id: userId }, data: { active } });
  await logAction(active ? "user.activated" : "user.deactivated", "User", userId);
  revalidatePath("/settings");
}
