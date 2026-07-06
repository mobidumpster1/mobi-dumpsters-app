"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { getValidConnection, listCustomers } from "@/lib/quickbooks";
import { getAgreementSettings } from "@/lib/agreement";
import { getReviewRequestSettings } from "@/lib/reviewSettings";
import { sendPendingReviewRequests } from "@/lib/reviewRequest";

function parsePick(formData: FormData, key: string) {
  const raw = str(formData, key);
  if (!raw) return { id: null, name: null };
  const [id, name] = raw.split("|||");
  return { id: id ?? null, name: name ?? null };
}

export async function saveAccountMappings(formData: FormData) {
  const connection = await db.quickBooksConnection.findFirst();
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
  await db.quickBooksConnection.deleteMany();
  revalidatePath("/settings");
}

export async function importCustomersFromQuickBooks() {
  const connection = await getValidConnection();
  if (!connection) throw new Error("Not connected to QuickBooks");

  const qboCustomers = await listCustomers(connection);

  for (const qc of qboCustomers) {
    const existing = await db.customer.findFirst({
      where: { OR: [{ quickbooksCustomerId: qc.Id }, { name: qc.DisplayName }] },
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

export async function updateAgreementSettings(formData: FormData) {
  const settings = await getAgreementSettings();
  const title = str(formData, "title") || "Service & Rental Agreement";
  const content = str(formData, "content") || "";

  await db.serviceAgreementSettings.update({
    where: { id: settings.id },
    data: { title, content },
  });

  revalidatePath("/settings");
}

export async function updateReviewRequestSettings(formData: FormData) {
  const settings = await getReviewRequestSettings();
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
  const result = await sendPendingReviewRequests();
  revalidatePath("/settings");
  redirect(`/settings?reviews_sent=${result.sent}&reviews_checked=${result.checked ?? 0}`);
}
