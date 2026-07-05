export function computeBookingStatus(
  items: { deliveredAt: Date | null; actualReturnDate: Date | null }[]
): "Completed" | "In Progress" | "Scheduled" {
  if (items.length > 0 && items.every((i) => i.actualReturnDate)) {
    return "Completed";
  }
  if (items.some((i) => i.deliveredAt)) return "In Progress";
  return "Scheduled";
}
