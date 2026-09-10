import { db } from "@/lib/db";

// One row per organization. Created with online booking fully open (no
// away mode, no minimum notice) on first use, same pattern as
// getDumpScheduleSettings.
export async function getBookingAvailabilitySettings(organizationId: string) {
  const existing = await db.bookingAvailabilitySettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.bookingAvailabilitySettings.create({ data: { organizationId } });
}
