"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser, requirePlanFor, hasPermission } from "@/lib/session";

// Anyone can clock themselves in/out — no special permission needed, same
// as how any staff member can already see and act on their own bookings.
// Editing or deleting *another* user's entry is gated separately below.
export async function clockIn(bookingId: string | null) {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  const open = await db.timeEntry.findFirst({
    where: { userId: user.id, organizationId: user.effectiveOrganizationId, clockOut: null },
  });
  if (open) throw new Error("You're already clocked in — clock out first.");

  await db.timeEntry.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      userId: user.id,
      bookingId: bookingId || null,
      clockIn: new Date(),
      hourlyRate: user.hourlyRate,
      source: "clock",
    },
  });

  revalidatePath("/time");
  if (bookingId) revalidatePath(`/bookings/${bookingId}`);
}

export async function clockOut(entryId: string) {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  const entry = await db.timeEntry.findFirst({
    where: { id: entryId, userId: user.id, organizationId: user.effectiveOrganizationId },
  });
  if (!entry) throw new Error("Time entry not found.");
  if (entry.clockOut) throw new Error("This entry is already clocked out.");

  await db.timeEntry.update({ where: { id: entryId }, data: { clockOut: new Date() } });

  revalidatePath("/time");
  if (entry.bookingId) revalidatePath(`/bookings/${entry.bookingId}`);
}

export async function addManualTimeEntry(formData: FormData) {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  const targetUserId = str(formData, "userId") || user.id;
  if (targetUserId !== user.id && !hasPermission(user, "canManageTime")) {
    throw new Error("You don't have permission to log time for someone else.");
  }

  const bookingId = str(formData, "bookingId");
  const clockInStr = str(formData, "clockIn");
  const clockOutStr = str(formData, "clockOut");
  const notes = str(formData, "notes");

  if (!clockInStr) throw new Error("Start time is required.");
  const clockInDate = new Date(clockInStr);
  const clockOutDate = clockOutStr ? new Date(clockOutStr) : null;
  if (clockOutDate && clockOutDate <= clockInDate) {
    throw new Error("End time must be after start time.");
  }

  const targetUser =
    targetUserId === user.id
      ? user
      : await db.user.findFirstOrThrow({
          where: { id: targetUserId, organizationId: user.effectiveOrganizationId },
        });

  await db.timeEntry.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      userId: targetUserId,
      bookingId: bookingId || null,
      clockIn: clockInDate,
      clockOut: clockOutDate,
      hourlyRate: targetUser.hourlyRate,
      source: "manual",
      notes,
    },
  });

  revalidatePath("/time");
  if (bookingId) revalidatePath(`/bookings/${bookingId}`);
}

export async function updateTimeEntry(entryId: string, formData: FormData) {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  const entry = await db.timeEntry.findFirst({
    where: { id: entryId, organizationId: user.effectiveOrganizationId },
  });
  if (!entry) throw new Error("Time entry not found.");
  if (entry.userId !== user.id && !hasPermission(user, "canManageTime")) {
    throw new Error("You don't have permission to edit someone else's time entry.");
  }

  const clockInStr = str(formData, "clockIn");
  const clockOutStr = str(formData, "clockOut");
  const notes = str(formData, "notes");

  if (!clockInStr) throw new Error("Start time is required.");
  const clockInDate = new Date(clockInStr);
  const clockOutDate = clockOutStr ? new Date(clockOutStr) : null;
  if (clockOutDate && clockOutDate <= clockInDate) {
    throw new Error("End time must be after start time.");
  }

  await db.timeEntry.update({
    where: { id: entryId },
    data: { clockIn: clockInDate, clockOut: clockOutDate, notes },
  });

  revalidatePath("/time");
  if (entry.bookingId) revalidatePath(`/bookings/${entry.bookingId}`);
}

export async function deleteTimeEntry(entryId: string) {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  const entry = await db.timeEntry.findFirst({
    where: { id: entryId, organizationId: user.effectiveOrganizationId },
  });
  if (!entry) return;
  if (entry.userId !== user.id && !hasPermission(user, "canManageTime")) {
    throw new Error("You don't have permission to delete someone else's time entry.");
  }

  await db.timeEntry.delete({ where: { id: entryId } });

  revalidatePath("/time");
  if (entry.bookingId) revalidatePath(`/bookings/${entry.bookingId}`);
}
