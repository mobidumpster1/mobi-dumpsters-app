"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { nextQuoteNumber } from "@/lib/quoting";
import { sendCustomerEmail, siteOrigin } from "@/lib/email";
import { sendCustomerSms, sendLeadSms } from "@/lib/twilio";
import { requirePermission, requirePlanFor, hasPlan } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

type LineItemInput = {
  description: string;
  amount: string;
  quantity: string;
  optional?: boolean;
};

export async function createQuote(formData: FormData) {
  const user = await requirePermission("canManageInvoices");
  requirePlanFor(user, "team");

  const leadId = str(formData, "leadId");
  const customerId = str(formData, "customerId");
  if (!leadId && !customerId) {
    throw new Error("A quote needs a lead or a customer to be for.");
  }

  const itemsJson = formData.get("lineItemsJson");
  const rawItems: LineItemInput[] = typeof itemsJson === "string" ? JSON.parse(itemsJson) : [];
  const lineItems = rawItems
    .filter((item) => item.description && Number(item.amount) > 0)
    .map((item) => ({
      description: item.description,
      amount: Number(item.amount),
      quantity: Number(item.quantity) || 1,
      optional: Boolean(item.optional),
    }));

  if (lineItems.length === 0) {
    throw new Error("Add at least one line item.");
  }

  const amount = lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const quoteNumber = await nextQuoteNumber(user.effectiveOrganizationId);

  const proposedDateStr = str(formData, "proposedDate");

  const quote = await db.quote.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      leadId,
      customerId,
      quoteNumber,
      amount,
      notes: str(formData, "notes"),
      proposedDate: proposedDateStr ? new Date(proposedDateStr) : null,
      lineItems: { create: lineItems },
    },
  });

  await logAction("quote.created", "Quote", quote.id);
  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}

// Emails and/or texts the customer-facing link. A lead with no linked
// Customer yet still gets texted directly (most inquiries here come in by
// phone/text, so that channel matters even before someone's a real
// Customer) — it just doesn't get logged to the CustomerSmsMessage thread,
// since that thread is keyed to a real Customer.
export async function sendQuote(quoteId: string) {
  const user = await requirePermission("canManageInvoices");
  requirePlanFor(user, "team");

  const quote = await db.quote.findFirstOrThrow({
    where: { id: quoteId, organizationId: user.effectiveOrganizationId },
    include: { lead: true, customer: true },
  });

  const name = quote.customer?.name ?? quote.lead?.name ?? "there";
  const email = quote.customer?.email ?? quote.lead?.email;
  const phone = quote.customer?.phone ?? quote.lead?.phone;

  if (!email && !phone) {
    throw new Error("Add an email or phone number before sending this quote.");
  }

  const link = `${siteOrigin()}/quote/${quote.publicToken}`;
  const message = [
    `Hi ${name},`,
    "",
    `Here's your quote ${quote.quoteNumber} for $${quote.amount.toFixed(2)}:`,
    "",
    link,
  ].join("\n");

  if (email) {
    await sendCustomerEmail(email, `Your quote ${quote.quoteNumber}`, message);
  }
  // SMS is a Pro-only feature — skip it rather than hitting sendCustomerSms's
  // "Connect Twilio in Settings" error, which would be a confusing thing to
  // tell a Team-plan owner who isn't actually allowed to connect Twilio yet.
  if (phone && hasPlan(user, "pro")) {
    if (quote.customerId) {
      await sendCustomerSms(user.effectiveOrganizationId, { id: quote.customerId, phone }, message);
    } else {
      // No Customer row yet to log the message thread against — a
      // best-effort raw send, same as the outbound call sendCustomerSms
      // makes, it just doesn't create a CustomerSmsMessage record.
      await sendLeadSms(user.effectiveOrganizationId, phone, message);
    }
  }

  await db.quote.update({ where: { id: quoteId }, data: { status: "sent", sentAt: new Date() } });

  // Reflects in the pipeline — but only moves a lead forward, never back
  // over a stage staff already set by hand (e.g. "interested").
  if (quote.leadId && ["new", "contacted", "interested"].includes(quote.lead?.status ?? "")) {
    await db.lead.update({ where: { id: quote.leadId }, data: { status: "quoted" } });
  }

  await logAction("quote.sent", "Quote", quoteId);
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/leads");
}

export async function deleteQuote(quoteId: string) {
  const user = await requirePermission("canDeleteRecords");
  requirePlanFor(user, "team");

  const quote = await db.quote.findFirstOrThrow({
    where: { id: quoteId, organizationId: user.effectiveOrganizationId },
  });
  if (quote.status !== "draft") {
    throw new Error("Only a draft quote can be deleted — a sent link may still be open.");
  }

  await db.quoteLineItem.deleteMany({ where: { quoteId } });
  await db.quote.delete({ where: { id: quoteId } });
  await logAction("quote.deleted", "Quote", quoteId);
  revalidatePath("/quotes");
  redirect("/quotes");
}

export async function expireQuote(quoteId: string) {
  const user = await requirePermission("canManageInvoices");
  requirePlanFor(user, "team");

  await db.quote.updateMany({
    where: { id: quoteId, organizationId: user.effectiveOrganizationId },
    data: { status: "expired" },
  });
  revalidatePath(`/quotes/${quoteId}`);
}
