"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

export async function addRecurringBill(formData: FormData) {
  await requirePermission("canManageExpenses");

  const name = str(formData, "name");
  const category = str(formData, "category");
  const frequency = str(formData, "frequency") ?? "monthly";
  if (!name) throw new Error("Name is required");
  if (!category) throw new Error("Category is required");

  const amountStr = str(formData, "amount");
  const dueDayStr = str(formData, "dueDay");
  const dueDateStr = str(formData, "dueDate");

  await db.recurringBill.create({
    data: {
      name,
      category,
      frequency,
      amount: amountStr ? Number(amountStr) : null,
      dueDay: frequency === "monthly" && dueDayStr ? Number(dueDayStr) : null,
      dueDate: frequency === "yearly" && dueDateStr ? new Date(dueDateStr) : null,
      paymentMethod: str(formData, "paymentMethod"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/expenses/recurring");
}

export async function updateRecurringBill(billId: string, formData: FormData) {
  await requirePermission("canManageExpenses");

  const name = str(formData, "name");
  const category = str(formData, "category");
  const frequency = str(formData, "frequency") ?? "monthly";
  if (!name) throw new Error("Name is required");
  if (!category) throw new Error("Category is required");

  const amountStr = str(formData, "amount");
  const dueDayStr = str(formData, "dueDay");
  const dueDateStr = str(formData, "dueDate");

  await db.recurringBill.update({
    where: { id: billId },
    data: {
      name,
      category,
      frequency,
      amount: amountStr ? Number(amountStr) : null,
      dueDay: frequency === "monthly" && dueDayStr ? Number(dueDayStr) : null,
      dueDate: frequency === "yearly" && dueDateStr ? new Date(dueDateStr) : null,
      paymentMethod: str(formData, "paymentMethod"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/expenses/recurring");
  redirect("/expenses/recurring");
}

export async function toggleRecurringBillActive(billId: string, currentlyActive: boolean) {
  await requirePermission("canManageExpenses");

  await db.recurringBill.update({
    where: { id: billId },
    data: { active: !currentlyActive },
  });
  revalidatePath("/expenses/recurring");
}

export async function deleteRecurringBill(billId: string) {
  await requirePermission("canManageExpenses");

  await db.recurringBill.delete({ where: { id: billId } });
  await logAction("recurring_bill.deleted", "RecurringBill", billId);
  revalidatePath("/expenses/recurring");
}

// Records this bill as an actual Expense (e.g. once you've paid it this
// period), pre-filled from the recurring bill's details — doesn't touch
// the recurring bill itself, so it can be logged again next period.
export async function logRecurringBillAsExpense(billId: string) {
  await requirePermission("canManageExpenses");

  const bill = await db.recurringBill.findUniqueOrThrow({ where: { id: billId } });

  const today = new Date();
  let dueDate: Date | null = null;
  if (bill.frequency === "monthly" && bill.dueDay) {
    dueDate = new Date(today.getFullYear(), today.getMonth(), bill.dueDay);
  } else if (bill.frequency === "yearly" && bill.dueDate) {
    dueDate = new Date(today.getFullYear(), bill.dueDate.getUTCMonth(), bill.dueDate.getUTCDate());
  }

  const expense = await db.expense.create({
    data: {
      vendor: bill.name,
      category: bill.category,
      amount: bill.amount ?? 0,
      date: today,
      dueDate,
      notes: bill.paymentMethod
        ? `Recurring ${bill.frequency} bill — ${bill.paymentMethod}`
        : `Recurring ${bill.frequency} bill`,
      status: "unpaid",
    },
  });

  revalidatePath("/expenses");
  redirect(`/expenses/${expense.id}`);
}
