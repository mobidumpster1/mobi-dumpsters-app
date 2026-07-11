export function computeDisplayStatus(status: string, dueDate: Date | null): string {
  if (status === "unpaid" && dueDate && dueDate.getTime() < Date.now()) {
    return "overdue";
  }
  return status;
}

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-600 text-white font-black",
  unpaid: "bg-amber-500 text-white font-black",
  partial: "bg-amber-500 text-white font-black",
  overdue: "bg-red-600 text-white font-black",
};
