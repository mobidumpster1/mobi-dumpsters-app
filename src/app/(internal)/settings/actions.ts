"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { getValidConnection, listCustomers, listPurchases } from "@/lib/quickbooks";
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

// A QuickBooks Purchase represents money already spent, so every imported
// row lands as a "paid" Expense — matching how pushExpensePurchase treats
// app-entered expenses once marked paid. Dedupes on quickbooksPurchaseId,
// the same field pushExpensePurchase sets, so re-clicking this only picks
// up purchases entered directly in QuickBooks since the last import —
// nothing the app itself already pushed gets duplicated back in.
export async function importExpensesFromQuickBooks() {
  const user = await requireUser();
  const connection = await getValidConnection(user.effectiveOrganizationId);
  if (!connection) throw new Error("Not connected to QuickBooks");

  const qboPurchases = await listPurchases(connection);

  for (const qp of qboPurchases) {
    const existing = await db.expense.findFirst({
      where: { organizationId: user.effectiveOrganizationId, quickbooksPurchaseId: qp.Id },
    });
    if (existing) continue;

    const firstLine = qp.Line?.find((l) => l.AccountBasedExpenseLineDetail);
    // Most of Chase's QuickBooks expenses have no Payee set — fall back to
    // the QuickBooks transaction number (visible in QBO's "NO." column) so
    // each stays distinguishable in the app's list instead of a repeated
    // generic label, and is still easy to look up on the QuickBooks side.
    const vendor = qp.EntityRef?.name ?? (qp.DocNumber ? `QuickBooks #${qp.DocNumber}` : "QuickBooks Import");
    const category = firstLine?.AccountBasedExpenseLineDetail?.AccountRef?.name ?? "Uncategorized";
    const date = new Date(qp.TxnDate);

    await db.expense.create({
      data: {
        organizationId: user.effectiveOrganizationId,
        vendor,
        category,
        amount: qp.TotalAmt ?? firstLine?.Amount ?? 0,
        date,
        status: "paid",
        paidDate: date,
        quickbooksPurchaseId: qp.Id,
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/expenses");
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

// Strips a pasted "https://book.example.com/" down to the bare hostname
// "book.example.com" so it matches what getPublicOrganizationId reads off
// the incoming request's host header — a raw paste with the protocol or a
// trailing slash would otherwise never match.
function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

export async function updatePublicDomain(formData: FormData) {
  const user = await requireUser();
  const raw = str(formData, "publicDomain");
  const publicDomain = raw ? normalizeDomain(raw) : null;

  if (publicDomain) {
    const existing = await db.organization.findUnique({ where: { publicDomain } });
    if (existing && existing.id !== user.effectiveOrganizationId) {
      throw new Error("That domain is already in use by another organization.");
    }
  }

  await db.organization.update({
    where: { id: user.effectiveOrganizationId },
    data: { publicDomain },
  });

  revalidatePath("/settings");
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

export async function saveWebsiteSnippet(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "id");
  const name = str(formData, "name");
  const html = str(formData, "html");
  if (!name) throw new Error("Name is required");
  if (!html) throw new Error("HTML is required");

  if (id) {
    await db.websiteSnippet.updateMany({
      where: { id, organizationId: user.effectiveOrganizationId },
      data: { name, html },
    });
  } else {
    await db.websiteSnippet.create({
      data: { organizationId: user.effectiveOrganizationId, name, html },
    });
  }
  revalidatePath("/settings");
}

export async function deleteWebsiteSnippet(id: string) {
  const user = await requireUser();
  await db.websiteSnippet.deleteMany({
    where: { id, organizationId: user.effectiveOrganizationId },
  });
  revalidatePath("/settings");
}

export async function saveStripeConnection(formData: FormData) {
  const user = await requireUser();
  const secretKey = str(formData, "secretKey");
  const publishableKey = str(formData, "publishableKey");
  const webhookSecret = str(formData, "webhookSecret");
  if (!secretKey) throw new Error("Secret key is required");
  if (!publishableKey) throw new Error("Publishable key is required");

  await db.stripeConnection.upsert({
    where: { organizationId: user.effectiveOrganizationId },
    create: { organizationId: user.effectiveOrganizationId, secretKey, publishableKey, webhookSecret },
    update: { secretKey, publishableKey, webhookSecret },
  });
  revalidatePath("/settings");
}

export async function disconnectStripe() {
  const user = await requireUser();
  await db.stripeConnection.deleteMany({ where: { organizationId: user.effectiveOrganizationId } });
  revalidatePath("/settings");
}
