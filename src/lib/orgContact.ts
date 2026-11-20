import "server-only";
import { db } from "@/lib/db";

// One business's identity and contact profile: its name, the phone customers
// call back on, the inbox owner alerts go to, its address and logo, and the
// time zone its "today" is reckoned in. Set per organization in Settings
// (Branding and Contact). Nothing here falls back to another business's
// details: a business that hasn't filled something in simply has it blank, and
// owner alerts go to the owner's own login email until an alert inbox is set.
export type OrgContact = {
  businessName: string;
  phone: string; // "" when the business hasn't set one
  email: string | null; // the alert inbox, or the owner's login email
  notificationEmail: string | null; // same as email (kept for existing callers)
  address: string | null;
  logoUrl: string | null;
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
    select: {
      name: true,
      contactPhone: true,
      notificationEmail: true,
      contactAddress: true,
      logoUrl: true,
      timeZone: true,
    },
  });
  let email = org.notificationEmail || null;
  if (!email) {
    // Owner alerts and replies go to the business's own owner, never to
    // another business's inbox.
    const owner = await db.user.findFirst({
      where: { organizationId, role: "owner", active: true },
      orderBy: { createdAt: "asc" },
      select: { email: true },
    });
    email = owner?.email ?? null;
  }
  return {
    businessName: org.name,
    phone: org.contactPhone ?? "",
    email,
    notificationEmail: email,
    address: org.contactAddress ?? null,
    logoUrl: org.logoUrl ?? null,
    timeZone: isValidTimeZone(org.timeZone) ? org.timeZone : "America/New_York",
  };
}

// Emails the owner of ONE business (their own alert inbox from Settings ->
// Contact, falling back to the platform default), so a booking request on one
// business's page never lands in another business's inbox. Never throws.
export async function notifyOwner(organizationId: string, subject: string, body: string) {
  try {
    // Loaded here, not at the top, because email.ts itself reads the org's
    // identity from this file.
    const { sendNotificationEmail } = await import("@/lib/email");
    const contact = await getOrgContact(organizationId);
    await sendNotificationEmail(subject, body, contact.notificationEmail);
  } catch (err) {
    console.error("notifyOwner failed:", err);
  }
}
