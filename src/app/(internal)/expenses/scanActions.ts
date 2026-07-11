"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { scanReceiptImage, isReceiptScanConfigured } from "@/lib/receiptScan";
import { saveExpenseReceiptFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

export async function scanReceipt(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A receipt photo is required");
  }
  if (!isReceiptScanConfigured()) {
    throw new Error(
      "Receipt scanning isn't set up yet — add an ANTHROPIC_API_KEY first."
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const scanned = await scanReceiptImage(
    buffer.toString("base64"),
    file.type || "image/jpeg"
  );

  const expense = await db.expense.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      vendor: scanned.vendor,
      category: scanned.category,
      amount: scanned.amount,
      date: new Date(scanned.date),
      status: "unpaid",
      notes: "Auto-filled from a scanned receipt — double check before marking paid.",
    },
  });

  const filePath = await saveExpenseReceiptFile(expense.id, file);
  await db.expenseReceipt.create({
    data: { expenseId: expense.id, filePath },
  });

  redirect(`/expenses/${expense.id}/edit`);
}
