import { db } from "@/lib/db";

// Server-only — separated from websiteBuilder.ts so that file (which
// FreeCanvasSectionEditor.tsx, a client component, also imports for its
// types/block helpers) never pulls `db` into the client bundle.
//
// One row per organization, created blank on first visit to the editor —
// same pattern as getBookingAvailabilitySettings/getDumpScheduleSettings.
export async function getWebsiteBuilderPage(organizationId: string) {
  const existing = await db.websiteBuilderPage.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.websiteBuilderPage.create({ data: { organizationId } });
}
