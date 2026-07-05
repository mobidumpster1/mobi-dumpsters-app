-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "quickbooksCustomerId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "quickbooksPurchaseId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "quickbooksInvoiceId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "quickbooksPaymentId" TEXT;

-- CreateTable
CREATE TABLE "QuickBooksConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "realmId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" DATETIME NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "defaultDepositAccountId" TEXT,
    "defaultDepositAccountName" TEXT,
    "defaultExpenseAccountId" TEXT,
    "defaultExpenseAccountName" TEXT,
    "defaultItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
