"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";
import { sendCustomerEmail } from "@/lib/email";

// Sends a saved Win-Back template to one or more customers (a single
// selected row is just a one-item array), swapping {{customerName}} for
// each customer's name. Customers with no email on file are silently
// skipped rather than failing the whole batch — the caller shows the
// sent/skipped counts so a partial send is never mistaken for a full one.
// Each successful send creates its own WinBackSend row (status "sent") so
// outreach can be tracked and followed up on, not just fired once.
export async function sendWinBackEmailBulk(customerIds: string[], templateId: string) {
  await requirePermission("canManageLeads");

  const template = await db.winBackEmailTemplate.findUniqueOrThrow({ where: { id: templateId } });
  const customers = await db.customer.findMany({ where: { id: { in: customerIds } } });

  let sent = 0;
  let skipped = 0;

  for (const customer of customers) {
    if (!customer.email) {
      skipped += 1;
      continue;
    }

    const subject = template.subject.replaceAll("{{customerName}}", customer.name);
    const body = template.body.replaceAll("{{customerName}}", customer.name);

    await sendCustomerEmail(customer.email, subject, body);
    await db.winBackSend.create({ data: { customerId: customer.id, templateId: template.id } });
    await logAction("customer.winback_email_sent", "Customer", customer.id);
    sent += 1;
  }

  revalidatePath("/customers/winback");
  return { sent, skipped };
}

// Lets staff track what happened after a send — did the customer respond,
// book again, or say no — instead of a send being a fire-and-forget blast
// with no follow-up visibility.
export async function updateWinBackSendStatus(sendId: string, status: string) {
  await requirePermission("canManageLeads");

  await db.winBackSend.update({ where: { id: sendId }, data: { status } });
  revalidatePath("/customers/winback");
}

export async function createWinBackEmailTemplate(formData: FormData) {
  await requirePermission("canManageLeads");

  const name = str(formData, "name");
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  if (!name || !subject || !body) {
    throw new Error("Name, subject, and body are all required.");
  }

  await db.winBackEmailTemplate.create({ data: { name, subject, body } });
  revalidatePath("/customers/winback");
}

export async function deleteWinBackEmailTemplate(templateId: string) {
  await requirePermission("canManageLeads");

  await db.winBackEmailTemplate.delete({ where: { id: templateId } });
  revalidatePath("/customers/winback");
}
