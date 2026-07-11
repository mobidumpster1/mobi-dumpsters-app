import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/email";
import { getReviewRequestSettings } from "@/lib/reviewSettings";
import { branding } from "@/lib/branding";
import { renderEmailTemplate } from "@/lib/emailTemplates";

// Finds jobs that are fully closed out (every item picked back up), haven't
// already gotten a review request, have a customer email on file, and were
// completed at least `delayDays` ago. Sends one email per booking and marks
// it so it's never asked twice. Never throws — this runs from a daily cron
// with no one watching, so a bad address or Resend hiccup on one booking
// shouldn't stop the rest from sending.
//
// Settings are per-organization, so this loops every organization and
// applies its own enabled/delayDays/googleReviewUrl — one org turning this
// off, or using a different delay, never affects another's.
export async function sendPendingReviewRequests() {
  const organizations = await db.organization.findMany({ select: { id: true } });

  let checked = 0;
  let sent = 0;
  const errors: string[] = [];
  const skippedOrgs: string[] = [];

  for (const org of organizations) {
    const settings = await getReviewRequestSettings(org.id);
    if (!settings.enabled || !settings.googleReviewUrl) {
      skippedOrgs.push(org.id);
      continue;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - settings.delayDays);

    const candidates = await db.booking.findMany({
      where: {
        organizationId: org.id,
        reviewRequestSentAt: null,
        status: { not: "cancelled" },
        customer: { email: { not: null } },
        items: { every: { actualReturnDate: { lte: cutoff } } },
      },
      include: { customer: true, items: true },
    });

    const eligible = candidates.filter((booking) => booking.items.length > 0);
    checked += eligible.length;

    for (const booking of eligible) {
      try {
        const { subject, body } = await renderEmailTemplate(
          "review_request",
          {
            customerName: booking.customer.name,
            businessName: branding.businessName,
            reviewUrl: settings.googleReviewUrl!,
          },
          org.id
        );
        await sendCustomerEmail(booking.customer.email!, subject, body);

        await db.$transaction([
          db.booking.update({
            where: { id: booking.id },
            data: { reviewRequestSentAt: new Date() },
          }),
          db.customerNote.create({
            data: {
              customerId: booking.customerId,
              type: "email",
              content: "Auto-sent review request email",
            },
          }),
        ]);
        sent++;
      } catch (error) {
        console.error(`Failed to send review request for booking ${booking.id}:`, error);
        errors.push(booking.id);
      }
    }
  }

  return {
    sent,
    checked,
    errors,
    skipped:
      skippedOrgs.length === organizations.length
        ? "Review requests aren't enabled yet — set this up in Settings."
        : null,
  };
}
