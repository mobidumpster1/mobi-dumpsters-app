// Date-only values (from <input type="date">) are stored as UTC midnight.
// Formatting them in the browser's local timezone can shift the displayed
// day backward, so we always render date-only fields in UTC.
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { timeZone: "UTC" });
}
