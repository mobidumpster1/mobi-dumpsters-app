"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveExpenseReceiptFile, deleteUploadedFile } from "@/lib/uploads";

export async function uploadExpenseReceipt(expenseId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A receipt file is required");
  }

  const filePath = await saveExpenseReceiptFile(expenseId, file);

  await db.expenseReceipt.create({
    data: { expenseId, filePath },
  });

  revalidatePath(`/expenses/${expenseId}`);
}

export async function deleteExpenseReceipt(receiptId: string) {
  const receipt = await db.expenseReceipt.delete({ where: { id: receiptId } });
  await deleteUploadedFile(receipt.filePath);
  revalidatePath(`/expenses/${receipt.expenseId}`);
}
