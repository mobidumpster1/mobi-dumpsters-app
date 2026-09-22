-- T179: no @@index existed anywhere in the schema. Every tenant-scoped
-- query relied purely on the implicit index Postgres creates for @id/
-- @unique columns; organizationId itself, and the date-range filters
-- Calendar/Reports/availability checks apply on top of it, had none.
-- Invisible at today's row counts, but every list/report/calendar query
-- would degrade toward a full-table scan as data and tenant count grow.

CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
CREATE INDEX "EquipmentItem_organizationId_idx" ON "EquipmentItem"("organizationId");
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");
CREATE INDEX "MileageLogEntry_organizationId_idx" ON "MileageLogEntry"("organizationId");
CREATE INDEX "GalleryPhoto_organizationId_idx" ON "GalleryPhoto"("organizationId");
CREATE INDEX "Booking_organizationId_idx" ON "Booking"("organizationId");
CREATE INDEX "RecurringBill_organizationId_idx" ON "RecurringBill"("organizationId");
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- BookingItem has no organizationId of its own (child table, reached
-- through Booking) but is the single most frequently range-queried
-- table in the app -- findAvailableItems filters by exactly this pair
-- on every availability check, calendar view, and public booking load.
CREATE INDEX "BookingItem_equipmentItemId_startDate_idx" ON "BookingItem"("equipmentItemId", "startDate");

-- Invoice and Expense are filtered by organizationId alone in most
-- places, but by organizationId + their date field specifically in
-- Reports' date-range filtering.
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");
CREATE INDEX "Invoice_organizationId_issueDate_idx" ON "Invoice"("organizationId", "issueDate");
CREATE INDEX "Expense_organizationId_idx" ON "Expense"("organizationId");
CREATE INDEX "Expense_organizationId_date_idx" ON "Expense"("organizationId", "date");

-- PlacesSearchLog's one real query (the monthly-quota count, see T169)
-- always filters by both together.
CREATE INDEX "PlacesSearchLog_organizationId_createdAt_idx" ON "PlacesSearchLog"("organizationId", "createdAt");
