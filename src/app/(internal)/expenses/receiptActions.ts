"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveExpenseReceiptFile, deleteUploadedFile } from "@/lib/uploads";
import { pushExpenseReceiptAttachment } from "@/lib/quickbooks";
import { requireUser } from "@/lib/session";

export async function uploadExpenseReceipt(expenseId: string, formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A receipt file is required");
  }

  const expense = await db.expense.findFirstOrThrow({
    where: { id: expenseId, organizationId: user.effectiveOrganizationId },
  });

  const filePath = await saveExpenseReceiptFile(expenseId, file);

  await db.expenseReceipt.create({
    data: { expenseId, filePath },
  });

  // This expense was already pushed to QuickBooks (marked paid before this
  // receipt was added) — attach it to the existing Purchase right away
  // instead of waiting for some later re-sync that doesn't exist.
  if (expense.quickbooksPurchaseId) {
    try {
      await pushExpenseReceiptAttachment({
        organizationId: user.effectiveOrganizationId,
        purchaseId: expense.quickbooksPurchaseId,
        fileUrl: filePath,
        fileName: file.name,
      });
    } catch (error) {
      console.error("Failed to push receipt to QuickBooks:", error);
    }
  }

  revalidatePath(`/expenses/${expenseId}`);
}

export async function deleteExpenseReceipt(receiptId: string) {
  const user = await requireUser();
  await db.expenseReceipt.findFirstOrThrow({
    where: { id: receiptId, expense: { organizationId: user.effectiveOrganizationId } },
  });
  const receipt = await db.expenseReceipt.delete({ where: { id: receiptId } });
  await deleteUploadedFile(receipt.filePath);
  revalidatePath(`/expenses/${receipt.expenseId}`);
}
