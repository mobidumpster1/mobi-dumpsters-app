import { db } from "@/lib/db";

// Customer.referralCode stores a full cuid (globally unique, set once at
// creation) — this derives a short, shareable form of it for display and
// for the ?ref= link, rather than adding a second lookup column. 8 base36
// characters is ~2.8 trillion combinations, comfortably collision-free for
// any one organization's customer list.
export function shortReferralCode(fullCode: string): string {
  return fullCode.slice(0, 8).toUpperCase();
}

// Resolves a short code (as typed into a ?ref= link) back to the customer
// it belongs to, scoped to one organization. Prefix match against the
// stored full cuid — cheap and index-friendly, no extra column needed.
export async function resolveReferralCode(organizationId: string, shortCode: string) {
  const trimmed = shortCode.trim();
  if (!trimmed) return null;
  return db.customer.findFirst({
    where: {
      organizationId,
      referralCode: { startsWith: trimmed.toLowerCase() },
    },
  });
}
