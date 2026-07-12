"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { pushExpensePurchase } from "@/lib/quickbooks";
import { deleteUploadedFile } from "@/lib/uploads";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

export async function createExpense(formData: FormData) {
  const user = await requirePermission("canManageExpenses");

  const vendor = str(formData, "vendor");
  const category = str(formData, "category");
  const amountStr = str(formData, "amount");
  const dateStr = str(formData, "date");
  if (!vendor) throw new Error("Vendor is required");
  if (!category) throw new Error("Category is required");
  if (!amountStr) throw new Error("Amount is required");
  if (!dateStr) throw new Error("Date is required");

  const dueDateStr = str(formData, "dueDate");

  const expense = await db.expense.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      vendor,
      category,
      amount: Number(amountStr) || 0,
      date: new Date(dateStr),
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      bookingId: str(formData, "bookingId"),
      equipmentItemId: str(formData, "equipmentItemId"),
      notes: str(formData, "notes"),
      status: "unpaid",
    },
  });

  redirect(`/expenses/${expense.id}`);
}

export async function updateExpense(expenseId: string, formData: FormData) {
  const user = await requirePermission("canManageExpenses");

  const vendor = str(formData, "vendor");
  const category = str(formData, "category");
  const amountStr = str(formData, "amount");
  const dateStr = str(formData, "date");
  if (!vendor) throw new Error("Vendor is required");
  if (!category) throw new Error("Category is required");
  if (!amountStr) throw new Error("Amount is required");
  if (!dateStr) throw new Error("Date is required");

  const dueDateStr = str(formData, "dueDate");

  await db.expense.updateMany({
    where: { id: expenseId, organizationId: user.effectiveOrganizationId },
    data: {
      vendor,
      category,
      amount: Number(amountStr) || 0,
      date: new Date(dateStr),
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      bookingId: str(formData, "bookingId"),
      equipmentItemId: str(formData, "equipmentItemId"),
      notes: str(formData, "notes"),
    },
  });

  redirect(`/expenses/${expenseId}`);
}

export async function markExpensePaid(expenseId: string) {
  const user = await requirePermission("canManageExpenses");

  await db.expense.findFirstOrThrow({
    where: { id: expenseId, organizationId: user.effectiveOrganizationId },
  });

  const expense = await db.expense.update({
    where: { id: expenseId },
    data: { status: "paid", paidDate: new Date() },
  });

  try {
    const purchaseId = await pushExpensePurchase({
      vendor: expense.vendor,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      organizationId: user.effectiveOrganizationId,
    });
    if (purchaseId) {
      await db.expense.update({
        where: { id: expenseId },
        data: { quickbooksPurchaseId: purchaseId },
      });
    }
  } catch (error) {
    // A QuickBooks hiccup shouldn't block marking the expense paid locally.
    console.error("Failed to push expense to QuickBooks:", error);
  }

  await logAction("expense.marked_paid", "Expense", expenseId);
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/expenses");
}

export async function markExpenseUnpaid(expenseId: string) {
  const user = await requirePermission("canManageExpenses");

  await db.expense.updateMany({
    where: { id: expenseId, organizationId: user.effectiveOrganizationId },
    data: { status: "unpaid", paidDate: null },
  });
  await logAction("expense.marked_unpaid", "Expense", expenseId);
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/expenses");
}

// Gated by canDeleteRecords (not just canManageExpenses) to match the same
// stricter permission bookings/invoices use for permanent deletes — a
// staff member trusted to log/edit expenses isn't necessarily trusted to
// erase financial records outright.
export async function deleteExpense(expenseId: string) {
  const user = await requirePermission("canDeleteRecords");

  const expense = await db.expense.findFirst({
    where: { id: expenseId, organizationId: user.effectiveOrganizationId },
    include: { receipts: true },
  });
  if (!expense) throw new Error("Expense not found");

  for (const receipt of expense.receipts) {
    await deleteUploadedFile(receipt.filePath);
  }
  await db.expenseReceipt.deleteMany({ where: { expenseId } });
  await db.expense.delete({ where: { id: expenseId } });

  await logAction("expense.deleted", "Expense", expenseId);
  revalidatePath("/expenses");
  redirect("/expenses");
}
