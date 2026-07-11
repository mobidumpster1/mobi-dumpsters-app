// Every table a business's own data lives in — these must never be read,
// counted, or bulk-written without an organizationId somewhere in the
// query. (Child tables like BookingItem or Photo aren't listed here: they
// have no organizationId of their own by design, and are reached through
// an already-scoped parent instead — see the comment on Booking.items in
// schema.prisma.)
export const ORG_SCOPED_MODELS = new Set([
  "Customer",
  "Booking",
  "Invoice",
  "Expense",
  "RecurringBill",
  "EquipmentCategory",
  "EquipmentItem",
  "Vehicle",
  "Document",
  "MileageLogEntry",
  "Lead",
  "GalleryPhoto",
  "ServiceArea",
  "PermitArea",
  "EmailSequence",
  "LeadEmailTemplate",
  "WinBackEmailTemplate",
  "PlacesSearchLog",
]);

// Only the operations whose `where` is both optional AND capable of
// carrying an organizationId filter. findUnique/findUniqueOrThrow are
// deliberately excluded — Prisma only allows unique fields in their
// `where`, so they structurally can't carry an org filter, and a handful
// of legitimate call sites look up a row by an id that was already
// verified against the org one step earlier in the same function. create/
// createMany/upsert are excluded too: TypeScript already makes
// organizationId a required field on every one of these models, so a
// missing value there is already a compile error, not a runtime risk.
export const GUARDED_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

export function whereContainsOrganizationId(where: unknown): boolean {
  if (!where || typeof where !== "object") return false;
  const obj = where as Record<string, unknown>;
  if ("organizationId" in obj) return true;
  for (const key of ["AND", "OR", "NOT"]) {
    const value = obj[key];
    if (Array.isArray(value) && value.some(whereContainsOrganizationId)) return true;
    if (value && typeof value === "object" && whereContainsOrganizationId(value)) return true;
  }
  return false;
}
