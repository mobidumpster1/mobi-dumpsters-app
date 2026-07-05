export function computeDisplayStatus(status: string, dueDate: Date | null): string {
  if (status === "unpaid" && dueDate && dueDate.getTime() < Date.now()) {
    return "overdue";
  }
  return status;
}

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-amber-100 text-amber-700",
  partial: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};
