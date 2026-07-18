import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/email";
import { getDeliveryReminderSettings } from "@/lib/deliveryReminderSettings";
import { branding } from "@/lib/branding";
import { renderEmailTemplate } from "@/lib/emailTemplates";

const MS_PER_HOUR = 3_600_000;

// Finds booking items whose delivery is coming up within the configured
// window (default 24 hours) and haven't been reminded about yet, then
// emails the customer a heads-up. Never throws — see sendPendingReviewRequests
// for why (daily cron, no one watching).
//
// Settings are per-organization, so this loops every organization and
// applies its own enabled/hoursBefore — one org turning this off never
// affects another's.
export async function sendPendingDeliveryReminders() {
  const organizations = await db.organization.findMany({ select: { id: true, plan: true } });

  let checked = 0;
  let sent = 0;
  const errors: string[] = [];
  const skippedOrgs: string[] = [];

  for (const org of organizations) {
    // Automated delivery reminders are a Team+ feature — a downgraded org
    // shouldn't keep getting them just because the toggle was left on.
    if (org.plan === "solo") {
      skippedOrgs.push(org.id);
      continue;
    }
    const settings = await getDeliveryReminderSettings(org.id);
    if (!settings.enabled) {
      skippedOrgs.push(org.id);
      continue;
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() + settings.hoursBefore * MS_PER_HOUR);

    const candidates = await db.bookingItem.findMany({
      where: {
        deliveredAt: null,
        deliveryReminderSentAt: null,
        startDate: { gte: now, lte: cutoff },
        booking: { status: "confirmed", organizationId: org.id },
      },
      include: {
        equipmentItem: true,
        booking: { include: { customer: true } },
      },
    });

    const eligible = candidates.filter((item) => item.booking.customer.email);
    checked += eligible.length;

    for (const item of eligible) {
      const customer = item.booking.customer;
      try {
        const { subject, body } = await renderEmailTemplate(
          "delivery_reminder",
          {
            customerName: customer.name,
            equipmentLabel: item.equipmentItem.label,
            address: item.booking.deliveryAddress,
            phone: branding.smsPhone,
            businessName: branding.businessName,
          },
          org.id
        );
        await sendCustomerEmail(customer.email!, subject, body);

        await db.bookingItem.update({
          where: { id: item.id },
          data: { deliveryReminderSentAt: now },
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send delivery reminder for booking item ${item.id}:`, error);
        errors.push(item.id);
      }
    }
  }

  return {
    sent,
    checked,
    errors,
    skipped:
      skippedOrgs.length === organizations.length
        ? "Delivery reminders aren't enabled yet — set this up in Settings."
        : null,
  };
}
