-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "customerId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "paidDate" DATETIME,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "quickbooksInvoiceId" TEXT,
    "quickbooksPaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "bookingId", "createdAt", "dueDate", "id", "invoiceNumber", "issueDate", "notes", "paidDate", "paymentMethod", "quickbooksInvoiceId", "quickbooksPaymentId", "status") SELECT "amount", "bookingId", "createdAt", "dueDate", "id", "invoiceNumber", "issueDate", "notes", "paidDate", "paymentMethod", "quickbooksInvoiceId", "quickbooksPaymentId", "status" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
