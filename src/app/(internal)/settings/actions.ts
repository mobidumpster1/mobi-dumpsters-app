"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { getValidConnection, listCustomers } from "@/lib/quickbooks";
import { getAgreementSettings } from "@/lib/agreement";
import { getReviewRequestSettings } from "@/lib/reviewSettings";
import { sendPendingReviewRequests } from "@/lib/reviewRequest";
import { getInvoiceReminderSettings } from "@/lib/invoiceReminderSettings";
import { sendPendingInvoiceReminders } from "@/lib/invoiceReminder";
import { getJobNotificationSettings } from "@/lib/jobNotificationSettings";
import { getDeliveryReminderSettings } from "@/lib/deliveryReminderSettings";
import { sendPendingDeliveryReminders } from "@/lib/deliveryReminder";
import { getWinBackSettings } from "@/lib/winbackSettings";
import {
  updateEmailTemplate,
  resetEmailTemplate,
  type EmailTemplateKey,
} from "@/lib/emailTemplates";
import { requireUser } from "@/lib/session";

function parsePick(formData: FormData, key: string) {
  const raw = str(formData, key);
  if (!raw) return { id: null, name: null };
  const [id, name] = raw.split("|||");
  return { id: id ?? null, name: name ?? null };
}

export async function saveAccountMappings(formData: FormData) {
  const user = await requireUser();
  const connection = await db.quickBooksConnection.findUnique({
    where: { organizationId: user.effectiveOrganizationId },
  });
  if (!connection) throw new Error("Not connected to QuickBooks");

  const deposit = parsePick(formData, "depositAccount");
  const income = parsePick(formData, "incomeAccount");
  const expense = parsePick(formData, "expenseAccount");

  await db.quickBooksConnection.update({
    where: { id: connection.id },
    data: {
      defaultDepositAccountId: deposit.id,
      defaultDepositAccountName: deposit.name,
      defaultIncomeAccountId: income.id,
      defaultIncomeAccountName: income.name,
      defaultExpenseAccountId: expense.id,
      defaultExpenseAccountName: expense.name,
    },
  });

  revalidatePath("/settings");
}

export async function disconnectQuickBooks() {
  const user = await requireUser();
  await db.quickBooksConnection.deleteMany({ where: { organizationId: user.effectiveOrganizationId } });
  revalidatePath("/settings");
}

export async function importCustomersFromQuickBooks() {
  const user = await requireUser();
  const connection = await getValidConnection(user.effectiveOrganizationId);
  if (!connection) throw new Error("Not connected to QuickBooks");

  const qboCustomers = await listCustomers(connection);

  for (const qc of qboCustomers) {
    const existing = await db.customer.findFirst({
      where: {
        organizationId: user.effectiveOrganizationId,
        OR: [{ quickbooksCustomerId: qc.Id }, { name: qc.DisplayName }],
      },
    });
    if (existing) {
      if (!existing.quickbooksCustomerId) {
        await db.customer.update({
          where: { id: existing.id },
          data: { quickbooksCustomerId: qc.Id },
        });
      }
      continue;
    }

    const addressParts = [
      qc.BillAddr?.Line1,
      qc.BillAddr?.City,
      qc.BillAddr?.CountrySubDivisionCode,
      qc.BillAddr?.PostalCode,
    ].filter(Boolean);

    await db.customer.create({
      data: {
        organizationId: user.effectiveOrganizationId,
        name: qc.DisplayName,
        email: qc.PrimaryEmailAddr?.Address ?? null,
        phone: qc.PrimaryPhone?.FreeFormNumber ?? null,
        address: addressParts.length > 0 ? addressParts.join(", ") : null,
        quickbooksCustomerId: qc.Id,
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/customers");
}

export async function updateBranding(formData: FormData) {
  const user = await requireUser();
  const logoUrl = str(formData, "logoUrl") || null;
  const primaryColor = str(formData, "primaryColor") || null;

  await db.organization.update({
    where: { id: user.effectiveOrganizationId },
    data: { logoUrl, primaryColor },
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function updateAgreementSettings(formData: FormData) {
  const user = await requireUser();
  const settings = await getAgreementSettings(user.effectiveOrganizationId);
  const title = str(formData, "title") || "Service & Rental Agreement";
  const content = str(formData, "content") || "";

  await db.serviceAgreementSettings.update({
    where: { id: settings.id },
    data: { title, content },
  });

  revalidatePath("/settings");
}

export async function updateReviewRequestSettings(formData: FormData) {
  const user = await requireUser();
  const settings = await getReviewRequestSettings(user.effectiveOrganizationId);
  const googleReviewUrl = str(formData, "googleReviewUrl") || null;
  const delayDaysStr = str(formData, "delayDays");
  const delayDays = delayDaysStr ? Math.max(0, Number(delayDaysStr) || 0) : 2;
  const enabled = formData.get("enabled") === "on";

  await db.reviewRequestSettings.update({
    where: { id: settings.id },
    data: { googleReviewUrl, delayDays, enabled },
  });

  revalidatePath("/settings");
}

export async function sendReviewRequestsNow() {
  await requireUser();
  const result = await sendPendingReviewRequests();
  revalidatePath("/settings");
  redirect(`/settings?reviews_sent=${result.sent}&reviews_checked=${result.checked ?? 0}`);
}

export async function updateInvoiceReminderSettings(formData: FormData) {
  const user = await requireUser();
  const settings = await getInvoiceReminderSettings(user.effectiveOrganizationId);
  const delayDaysStr = str(formData, "delayDays");
  const repeatDaysStr = str(formData, "repeatDays");
  const delayDays = delayDaysStr ? Math.max(0, Number(delayDaysStr) || 0) : 7;
  const repeatDays = repeatDaysStr ? Math.max(1, Number(repeatDaysStr) || 0) : 14;
  const enabled = formData.get("enabled") === "on";

  await db.invoiceReminderSettings.update({
    where: { id: settings.id },
    data: { delayDays, repeatDays, enabled },
  });

  revalidatePath("/settings");
}

export async function updateWinBackSettings(formData: FormData) {
  const user = await requireUser();
  const settings = await getWinBackSettings(user.effectiveOrganizationId);
  const lapsedDaysStr = str(formData, "lapsedDays");
  const lapsedDays = lapsedDaysStr ? Math.max(1, Number(lapsedDaysStr) || 0) : 90;

  await db.winBackSettings.update({
    where: { id: settings.id },
    data: { lapsedDays },
  });

  revalidatePath("/settings");
  revalidatePath("/customers/winback");
}

export async function addPermitArea(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Area name is required");

  await db.permitArea.upsert({
    where: { organizationId_name: { organizationId: user.effectiveOrganizationId, name } },
    create: { organizationId: user.effectiveOrganizationId, name },
    update: {},
  });

  revalidatePath("/settings");
}

export async function removePermitArea(areaId: string) {
  const user = await requireUser();
  await db.permitArea.deleteMany({
    where: { id: areaId, organizationId: user.effectiveOrganizationId },
  });
  revalidatePath("/settings");
}

export async function sendInvoiceRemindersNow() {
  await requireUser();
  const result = await sendPendingInvoiceReminders();
  revalidatePath("/settings");
  redirect(`/settings?invoices_sent=${result.sent}&invoices_checked=${result.checked ?? 0}`);
}

export async function updateJobNotificationSettings(formData: FormData) {
  const user = await requireUser();
  const settings = await getJobNotificationSettings(user.effectiveOrganizationId);
  const enabled = formData.get("enabled") === "on";

  await db.jobNotificationSettings.update({
    where: { id: settings.id },
    data: { enabled },
  });

  revalidatePath("/settings");
}

export async function updateDeliveryReminderSettings(formData: FormData) {
  const user = await requireUser();
  const settings = await getDeliveryReminderSettings(user.effectiveOrganizationId);
  const hoursBeforeStr = str(formData, "hoursBefore");
  const hoursBefore = hoursBeforeStr ? Math.max(1, Number(hoursBeforeStr) || 0) : 24;
  const enabled = formData.get("enabled") === "on";

  await db.deliveryReminderSettings.update({
    where: { id: settings.id },
    data: { hoursBefore, enabled },
  });

  revalidatePath("/settings");
}

export async function sendDeliveryRemindersNow() {
  await requireUser();
  const result = await sendPendingDeliveryReminders();
  revalidatePath("/settings");
  redirect(`/settings?deliveries_sent=${result.sent}&deliveries_checked=${result.checked ?? 0}`);
}

export async function saveEmailTemplate(key: EmailTemplateKey, formData: FormData) {
  const user = await requireUser();
  const subject = str(formData, "subject") || "";
  const body = str(formData, "body") || "";
  await updateEmailTemplate(key, subject, body, user.effectiveOrganizationId);
  revalidatePath("/settings");
}

export async function resetEmailTemplateToDefault(key: EmailTemplateKey) {
  const user = await requireUser();
  await resetEmailTemplate(key, user.effectiveOrganizationId);
  revalidatePath("/settings");
}
