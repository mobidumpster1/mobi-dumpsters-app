// US-only phone helpers — good enough for a Middle Georgia business.
// Handles the realistic input shapes a customer's phone might already be
// stored in (formatted, unformatted, with/without a leading 1) without
// requiring a data migration of existing records.

// Converts a US phone number to E.164 (+14785550100) for the Twilio API.
// Returns null if it doesn't look like a valid 10-digit US number, so
// callers can surface a real error instead of silently failing at Twilio.
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// Strips everything but digits and keeps the last 10 — used to match an
// inbound webhook's "From" number (always E.164) against however a
// customer's phone happens to be stored today (formatted, unformatted,
// with or without a country code), without rewriting historical data.
export function lastTenDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}
