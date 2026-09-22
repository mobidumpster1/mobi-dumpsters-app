ALTER TABLE "Invoice" ADD COLUMN "source" TEXT;
ALTER TABLE "Expense" ADD COLUMN "source" TEXT;

-- Backfill only where the provenance is already unambiguous from an
-- existing field; every other row is left NULL rather than guessed at.
UPDATE "Invoice" SET "source" = 'spreadsheet_import' WHERE "invoiceNumber" LIKE 'HIST-%';
UPDATE "Expense" SET "source" = 'quickbooks_import' WHERE "quickbooksPurchaseId" IS NOT NULL;
