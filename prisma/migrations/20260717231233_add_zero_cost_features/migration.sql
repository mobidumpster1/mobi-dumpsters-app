-- AlterTable: Customer referral fields. referralCode is added nullable
-- first, backfilled with a unique value for existing rows (new rows get a
-- real cuid() from Prisma at insert time), then locked to NOT NULL.
ALTER TABLE "Customer" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredByCustomerId" TEXT;

UPDATE "Customer" SET "referralCode" = gen_random_uuid()::text WHERE "referralCode" IS NULL;

ALTER TABLE "Customer" ALTER COLUMN "referralCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "InvoicePhoto" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "mediaType" TEXT NOT NULL DEFAULT 'photo',
    "caption" TEXT,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceInstallment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotePhoto" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "mediaType" TEXT NOT NULL DEFAULT 'photo',
    "caption" TEXT,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCostingSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "marginAlertPercent" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCostingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobCostingSettings_organizationId_key" ON "JobCostingSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_referralCode_key" ON "Customer"("referralCode");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_referredByCustomerId_fkey" FOREIGN KEY ("referredByCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePhoto" ADD CONSTRAINT "InvoicePhoto_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceInstallment" ADD CONSTRAINT "InvoiceInstallment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotePhoto" ADD CONSTRAINT "QuotePhoto_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCostingSettings" ADD CONSTRAINT "JobCostingSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
