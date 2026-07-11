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
export async function sendPendingReviewRequests() {
  const settings = await getReviewRequestSettings();
  if (!settings.enabled || !settings.googleReviewUrl) {
    return {
      sent: 0,
      checked: 0,
      errors: [] as string[],
      skipped: "Review requests aren't enabled yet — set this up in Settings.",
    };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - settings.delayDays);

  // Settings are still a single global row (not per-organization yet), so
  // this applies one on/off switch and one delay to every organization's
  // bookings. Not a data leak — each candidate's own customer gets
  // emailed about their own booking — but every org shares one
  // configuration until settings themselves become per-organization.
  const candidates = await db.booking.findMany({
    where: {
      reviewRequestSentAt: null,
      status: { not: "cancelled" },
      customer: { email: { not: null } },
      items: { every: { actualReturnDate: { lte: cutoff } } },
    },
    include: { customer: true, items: true },
  });

  const eligible = candidates.filter((booking) => booking.items.length > 0);

  let sent = 0;
  const errors: string[] = [];

  for (const booking of eligible) {
    try {
      const { subject, body } = await renderEmailTemplate("review_request", {
        customerName: booking.customer.name,
        businessName: branding.businessName,
        reviewUrl: settings.googleReviewUrl!,
      });
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

  return { sent, checked: eligible.length, errors, skipped: null as string | null };
}
