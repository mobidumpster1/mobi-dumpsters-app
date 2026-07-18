import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/email";
import { getInvoiceReminderSettings } from "@/lib/invoiceReminderSettings";
import { branding } from "@/lib/branding";
import { renderEmailTemplate } from "@/lib/emailTemplates";

const MS_PER_DAY = 86_400_000;

// Finds unpaid/partial invoices that are past their due date by at least
// `delayDays`, and haven't been nagged again within the last `repeatDays`,
// then emails the customer a reminder. Never throws — see
// sendPendingReviewRequests for why (daily cron, no one watching).
//
// Settings are per-organization, so this loops every organization and
// applies its own enabled/delayDays/repeatDays — one org turning this off
// never affects another's.
export async function sendPendingInvoiceReminders() {
  const organizations = await db.organization.findMany({ select: { id: true, plan: true } });

  let checked = 0;
  let sent = 0;
  const errors: string[] = [];
  const skippedOrgs: string[] = [];

  for (const org of organizations) {
    // Automated invoice reminders are a Team+ feature — a downgraded org
    // shouldn't keep getting them just because the toggle was left on.
    if (org.plan === "solo") {
      skippedOrgs.push(org.id);
      continue;
    }
    const settings = await getInvoiceReminderSettings(org.id);
    if (!settings.enabled) {
      skippedOrgs.push(org.id);
      continue;
    }

    const now = new Date();
    const cutoffFirst = new Date(now.getTime() - settings.delayDays * MS_PER_DAY);
    const cutoffRepeat = new Date(now.getTime() - settings.repeatDays * MS_PER_DAY);

    const candidates = await db.invoice.findMany({
      where: {
        organizationId: org.id,
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
    checked += eligible.length;

    for (const { invoice, customer } of eligible) {
      const daysOverdue = Math.floor((now.getTime() - invoice.dueDate!.getTime()) / MS_PER_DAY);
      try {
        const { subject, body } = await renderEmailTemplate(
          "invoice_reminder",
          {
            customerName: customer!.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount.toFixed(2),
            daysOverdue: `${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`,
            businessName: branding.businessName,
          },
          org.id
        );
        await sendCustomerEmail(customer!.email!, subject, body);

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
  }

  return {
    sent,
    checked,
    errors,
    skipped:
      skippedOrgs.length === organizations.length
        ? "Invoice reminders aren't enabled yet — set this up in Settings."
        : null,
  };
}
