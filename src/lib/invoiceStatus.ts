import { Prisma } from "@/generated/prisma";

export function computeDisplayStatus(status: string, dueDate: Date | null): string {
  if (status === "unpaid" && dueDate && dueDate.getTime() < Date.now()) {
    return "overdue";
  }
  return status;
}

type BalanceInstallment = { amount: number; status: string; dueDate: Date | null };
type BalanceInvoice = {
  status: string;
  amount: number;
  dueDate: Date | null;
  issueDate: Date;
  installments?: BalanceInstallment[];
};

// What the customer still owes on an invoice. A paid invoice owes nothing. An
// invoice on a payment plan owes the installments not yet paid, so a $1,000 job
// with the $300 deposit in owes $700, not $1,000. Reports, aging and reminder
// emails all use this so they agree with each other.
export function invoiceBalanceDue(invoice: BalanceInvoice): number {
  if (invoice.status === "paid") return 0;
  const plan = invoice.installments ?? [];
  if (plan.length > 0) {
    return plan.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.amount, 0);
  }
  return invoice.amount;
}

// The date an unpaid invoice's lateness is counted from: the earliest unpaid
// installment's due date when there's a plan (the deposit being paid doesn't
// make a missed balance payment "current"), otherwise the invoice's due date,
// falling back to when it was issued.
export function invoiceDueAnchor(invoice: BalanceInvoice): Date {
  const pending = (invoice.installments ?? []).filter((i) => i.status === "pending" && i.dueDate);
  if (pending.length > 0) {
    return pending.reduce((min, i) => (i.dueDate! < min ? i.dueDate! : min), pending[0].dueDate!);
  }
  return invoice.dueDate ?? invoice.issueDate;
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
