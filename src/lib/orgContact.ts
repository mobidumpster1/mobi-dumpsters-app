import "server-only";
import { db } from "@/lib/db";
import { branding } from "@/lib/branding";
import { sendNotificationEmail } from "@/lib/email";

// One business's contact profile: the phone customers call back on, the
// inbox owner alerts go to, and the time zone its "today" is reckoned in.
// Set per organization in Settings -> Business Contact. Unset fields fall
// back to the legacy single-tenant values (config/branding.json and the
// NOTIFICATION_EMAIL env, via sendNotificationEmail's default recipient),
// so the original business keeps working unchanged until it fills these in.
// A newly onboarded business should always set its own.
export type OrgContact = {
  businessName: string;
  phone: string;
  notificationEmail: string | null; // null = sendNotificationEmail's default inbox
  timeZone: string;
};

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function getOrgContact(organizationId: string): Promise<OrgContact> {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, contactPhone: true, notificationEmail: true, timeZone: true },
  });
  return {
    businessName: org.name || branding.businessName,
    phone: org.contactPhone || branding.smsPhone || branding.phone,
    notificationEmail: org.notificationEmail || null,
    timeZone: isValidTimeZone(org.timeZone) ? org.timeZone : "America/New_York",
  };
}

// Emails the owner of ONE business (their own alert inbox from Settings ->
// Contact, falling back to the platform default), so a booking request on one
// business's page never lands in another business's inbox. Never throws.
export async function notifyOwner(organizationId: string, subject: string, body: string) {
  try {
    const contact = await getOrgContact(organizationId);
    await sendNotificationEmail(subject, body, contact.notificationEmail);
  } catch (err) {
    console.error("notifyOwner failed:", err);
  }
}
