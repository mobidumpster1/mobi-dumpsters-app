-- T084/T085: RecurringBill was purely a template with no link to the
-- expenses actually logged against it, so there was no way to see which
-- periods had already been logged, and nothing stopped logging the same
-- period twice.
ALTER TABLE "Expense" ADD COLUMN "recurringBillId" TEXT;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringBillId_fkey" FOREIGN KEY ("recurringBillId") REFERENCES "RecurringBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
