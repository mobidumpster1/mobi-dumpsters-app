import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/email";
import { getInvoiceReminderSettings } from "@/lib/invoiceReminderSettings";
import { branding } from "@/lib/branding";

const MS_PER_DAY = 86_400_000;

// Finds unpaid/partial invoices that are past their due date by at least
// `delayDays`, and haven't been nagged again within the last `repeatDays`,
// then emails the customer a reminder. Never throws — see
// sendPendingReviewRequests for why (daily cron, no one watching).
export async function sendPendingInvoiceReminders() {
  const settings = await getInvoiceReminderSettings();
  if (!settings.enabled) {
    return {
      sent: 0,
      checked: 0,
      errors: [] as string[],
      skipped: "Invoice reminders aren't enabled yet — set this up in Settings.",
    };
  }

  const now = new Date();
  const cutoffFirst = new Date(now.getTime() - settings.delayDays * MS_PER_DAY);
  const cutoffRepeat = new Date(now.getTime() - settings.repeatDays * MS_PER_DAY);

  const candidates = await db.invoice.findMany({
    where: {
      status: { not: "paid" },
      dueDate: { not: null, lte: cutoffFirst },
      OR: [{ lastReminderSentAt: null }, { lastReminderSentAt: { lte: cutoffRepeat } }],
    },
    include: {
      booking: { include: { customer: true } },
      customer: true,
    },
  });

  const eligible = candidates
    .map((invoice) => ({ invoice, customer: invoice.booking?.customer ?? invoice.customer }))
    .filter((row) => row.customer?.email);

  let sent = 0;
  const errors: string[] = [];

  for (const { invoice, customer } of eligible) {
    const daysOverdue = Math.floor((now.getTime() - invoice.dueDate!.getTime()) / MS_PER_DAY);
    try {
      await sendCustomerEmail(
        customer!.email!,
        `Reminder: Invoice ${invoice.invoiceNumber} is past due`,
        [
          `Hi ${customer!.name},`,
          "",
          `This is a friendly reminder that invoice ${invoice.invoiceNumber} for $${invoice.amount.toFixed(2)} is now ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} past due.`,
          "",
          `Let us know if you have questions or need to arrange payment.`,
          "",
          `Thanks,`,
          `- ${branding.businessName}`,
        ].join("\n")
      );

      await db.$transaction([
        db.invoice.update({
          where: { id: invoice.id },
          data: { lastReminderSentAt: now },
        }),
        db.customerNote.create({
          data: {
            customerId: customer!.id,
            type: "email",
            content: `Auto-sent overdue reminder for invoice ${invoice.invoiceNumber}`,
          },
        }),
      ]);
      sent++;
    } catch (error) {
      console.error(`Failed to send invoice reminder for ${invoice.id}:`, error);
      errors.push(invoice.id);
    }
  }

  return { sent, checked: eligible.length, errors, skipped: null as string | null };
}
