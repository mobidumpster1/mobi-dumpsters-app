import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/email";
import { sendCustomerSms } from "@/lib/twilio";
import { branding } from "@/lib/branding";

export async function getJobPhotoNotificationSettings(organizationId: string) {
  const existing = await db.jobPhotoNotificationSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.jobPhotoNotificationSettings.create({ data: { organizationId } });
}

const VERB: Record<"delivery" | "pickup", string> = {
  delivery: "delivered",
  pickup: "picked up",
};

// Sends whichever channel(s) are configured — best-effort on each: a
// missing phone/email or an unconfigured Twilio connection just skips that
// channel rather than failing the whole notification, since "email" and
// "sms" not being independent booleans (see the settings model) means only
// one channel is normally even expected to fire.
export async function sendJobPhotoNotification(
  bookingId: string,
  type: "delivery" | "pickup",
  photoUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: true },
  });
  const settings = await getJobPhotoNotificationSettings(booking.organizationId);
  const verb = VERB[type];
  const subject = `Your rental has been ${verb}`;
  const bodyLines = [
    `Hi ${booking.customer.name},`,
    "",
    `Your rental at ${booking.deliveryAddress} has just been ${verb}.`,
    "",
    `Photo: ${photoUrl}`,
    "",
    `Questions? Call or text us at ${branding.smsPhone}.`,
  ];

  const errors: string[] = [];
  let sentAny = false;

  if (settings.channel === "email" || settings.channel === "both") {
    if (booking.customer.email) {
      try {
        await sendCustomerEmail(booking.customer.email, subject, bodyLines.join("\n"));
        sentAny = true;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Email failed");
      }
    } else if (settings.channel === "email") {
      errors.push("No email on file for this customer.");
    }
  }

  if (settings.channel === "sms" || settings.channel === "both") {
    if (booking.customer.phone) {
      try {
        await sendCustomerSms(
          booking.organizationId,
          { id: booking.customer.id, phone: booking.customer.phone },
          `${subject} — ${photoUrl}`
        );
        sentAny = true;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Text failed");
      }
    } else if (settings.channel === "sms") {
      errors.push("No phone number on file for this customer.");
    }
  }

  return { sent: sentAny, error: errors.length > 0 ? errors.join(" ") : undefined };
}
