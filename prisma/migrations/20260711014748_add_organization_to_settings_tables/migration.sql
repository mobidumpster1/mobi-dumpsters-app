-- DropIndex
DROP INDEX "EmailTemplate_key_key";

-- AlterTable
ALTER TABLE "DeliveryReminderSettings" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "InvoiceReminderSettings" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "JobNotificationSettings" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "LeadOutreachSettings" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "QuickBooksConnection" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ReviewRequestSettings" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ServiceAgreementSettings" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "WinBackSettings" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryReminderSettings_organizationId_key" ON "DeliveryReminderSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_organizationId_key" ON "EmailTemplate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_organizationId_key_key" ON "EmailTemplate"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReminderSettings_organizationId_key" ON "InvoiceReminderSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "JobNotificationSettings_organizationId_key" ON "JobNotificationSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadOutreachSettings_organizationId_key" ON "LeadOutreachSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksConnection_organizationId_key" ON "QuickBooksConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequestSettings_organizationId_key" ON "ReviewRequestSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAgreementSettings_organizationId_key" ON "ServiceAgreementSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WinBackSettings_organizationId_key" ON "WinBackSettings"("organizationId");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickBooksConnection" ADD CONSTRAINT "QuickBooksConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreementSettings" ADD CONSTRAINT "ServiceAgreementSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequestSettings" ADD CONSTRAINT "ReviewRequestSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminderSettings" ADD CONSTRAINT "InvoiceReminderSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNotificationSettings" ADD CONSTRAINT "JobNotificationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryReminderSettings" ADD CONSTRAINT "DeliveryReminderSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadOutreachSettings" ADD CONSTRAINT "LeadOutreachSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinBackSettings" ADD CONSTRAINT "WinBackSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

