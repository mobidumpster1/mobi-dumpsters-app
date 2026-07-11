"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveExpenseReceiptFile, deleteUploadedFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

export async function uploadExpenseReceipt(expenseId: string, formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A receipt file is required");
  }

  await db.expense.findFirstOrThrow({
    where: { id: expenseId, organizationId: user.effectiveOrganizationId },
  });

  const filePath = await saveExpenseReceiptFile(expenseId, file);

  await db.expenseReceipt.create({
    data: { expenseId, filePath },
  });

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
