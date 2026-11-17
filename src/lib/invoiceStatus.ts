import { Prisma } from "@/generated/prisma";

export function computeDisplayStatus(status: string, dueDate: Date | null): string {
  if (status === "unpaid" && dueDate && dueDate.getTime() < Date.now()) {
    return "overdue";
  }
  return status;
}

// The SQL-side equivalent of computeDisplayStatus, for filtering/counting
// server-side (T180) instead of fetching every invoice and filtering in
// memory. Must stay in lockstep with computeDisplayStatus above.
export function invoiceStatusFilter(displayStatus: string): Prisma.InvoiceWhereInput {
  const now = new Date();
  switch (displayStatus) {
    case "overdue":
      return { status: "unpaid", dueDate: { lt: now } };
    case "unpaid":
      return { status: "unpaid", OR: [{ dueDate: null }, { dueDate: { gte: now } }] };
    case "partial":
      return { status: "partial" };
    case "paid":
      return { status: "paid" };
    default:
      return {};
  }
}

// Cancelling or declining a booking leaves its invoice in place (nothing
// voids it), so anything that means "money someone owes us" — the unpaid
// list, reports' receivables, the overdue-reminder emails — must skip
// invoices whose booking was cancelled, or a customer who cancelled shows
// up as owing money and can be sent payment reminders.
export const invoiceNotOnCancelledBooking: Prisma.InvoiceWhereInput = {
  OR: [{ bookingId: null }, { booking: { status: { not: "cancelled" } } }],
};

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-600 text-white font-black",
  unpaid: "bg-amber-500 text-white font-black",
  partial: "bg-amber-500 text-white font-black",
  overdue: "bg-red-600 text-white font-black",
};
