"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";
import { sendCustomerEmail } from "@/lib/email";

// Sends a saved Win-Back template to a customer, swapping {{customerName}}
// for their name. Same shape as leads/actions.ts's sendLeadEmail — throws
// (surfaced to the button that triggered it) if there's no email on file
// or the send itself fails.
export async function sendWinBackEmail(customerId: string, templateId: string) {
  await requirePermission("canManageLeads");

  const [customer, template] = await Promise.all([
    db.customer.findUniqueOrThrow({ where: { id: customerId } }),
    db.winBackEmailTemplate.findUniqueOrThrow({ where: { id: templateId } }),
  ]);

  if (!customer.email) {
    throw new Error("Add an email address for this customer before sending.");
  }

  const subject = template.subject.replaceAll("{{customerName}}", customer.name);
  const body = template.body.replaceAll("{{customerName}}", customer.name);

  await sendCustomerEmail(customer.email, subject, body);

  await db.customer.update({
    where: { id: customerId },
    data: { lastWinBackEmailSentAt: new Date() },
  });
  await logAction("customer.winback_email_sent", "Customer", customerId);
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
