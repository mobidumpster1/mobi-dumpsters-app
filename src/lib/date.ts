// Date-only values (from <input type="date">) are stored as UTC midnight.
// Formatting them in the browser's local timezone can shift the displayed
// day backward, so we always render date-only fields in UTC.
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { timeZone: "UTC" });
}

// Like formatDate, but also shows the time of day if one was actually set
// (i.e. the stored value isn't exactly UTC midnight). Times are entered and
// displayed as literal UTC digits — see combineDateAndTime in
// BookingItemsBuilder for why.
export function formatDateAndTime(date: Date): string {
  const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0;
  if (!hasTime) return formatDate(date);
  return `${formatDate(date)}, ${date.toLocaleTimeString(undefined, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
