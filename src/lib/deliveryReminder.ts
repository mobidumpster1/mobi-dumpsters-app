import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/email";
import { getDeliveryReminderSettings } from "@/lib/deliveryReminderSettings";
import { branding } from "@/lib/branding";

const MS_PER_HOUR = 3_600_000;

// Finds booking items whose delivery is coming up within the configured
// window (default 24 hours) and haven't been reminded about yet, then
// emails the customer a heads-up. Never throws — see sendPendingReviewRequests
// for why (daily cron, no one watching).
export async function sendPendingDeliveryReminders() {
  const settings = await getDeliveryReminderSettings();
  if (!settings.enabled) {
    return {
      sent: 0,
      checked: 0,
      errors: [] as string[],
      skipped: "Delivery reminders aren't enabled yet — set this up in Settings.",
    };
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + settings.hoursBefore * MS_PER_HOUR);

  const candidates = await db.bookingItem.findMany({
    where: {
      deliveredAt: null,
      deliveryReminderSentAt: null,
      startDate: { gte: now, lte: cutoff },
      booking: { status: "confirmed" },
    },
    include: {
      equipmentItem: true,
      booking: { include: { customer: true } },
    },
  });

  const eligible = candidates.filter((item) => item.booking.customer.email);

  let sent = 0;
  const errors: string[] = [];

  for (const item of eligible) {
    const customer = item.booking.customer;
    try {
      await sendCustomerEmail(
        customer.email!,
        `Reminder: ${branding.businessName} delivery coming up`,
        [
          `Hi ${customer.name},`,
          "",
          `Just a heads-up that we'll be delivering your ${item.equipmentItem.label} to ${item.booking.deliveryAddress} soon.`,
          "",
          `Questions? Call or text us at ${branding.phone}.`,
          "",
          `- ${branding.businessName}`,
        ].join("\n")
      );

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

  return { sent, checked: eligible.length, errors, skipped: null as string | null };
}
