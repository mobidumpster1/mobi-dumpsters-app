-- T180: the Bookings list page now paginates server-side, sorted by
-- createdAt desc -- add a composite index to match, same pattern as
-- Invoice(organizationId, issueDate) and Expense(organizationId, date).
CREATE INDEX "Booking_organizationId_createdAt_idx" ON "Booking"("organizationId", "createdAt");
