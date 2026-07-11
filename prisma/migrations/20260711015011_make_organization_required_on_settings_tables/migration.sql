-- DropForeignKey
ALTER TABLE "DeliveryReminderSettings" DROP CONSTRAINT "DeliveryReminderSettings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "EmailTemplate" DROP CONSTRAINT "EmailTemplate_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceReminderSettings" DROP CONSTRAINT "InvoiceReminderSettings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "JobNotificationSettings" DROP CONSTRAINT "JobNotificationSettings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "LeadOutreachSettings" DROP CONSTRAINT "LeadOutreachSettings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "QuickBooksConnection" DROP CONSTRAINT "QuickBooksConnection_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewRequestSettings" DROP CONSTRAINT "ReviewRequestSettings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceAgreementSettings" DROP CONSTRAINT "ServiceAgreementSettings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WinBackSettings" DROP CONSTRAINT "WinBackSettings_organizationId_fkey";

-- AlterTable
ALTER TABLE "DeliveryReminderSettings" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "EmailTemplate" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "InvoiceReminderSettings" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "JobNotificationSettings" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LeadOutreachSettings" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "QuickBooksConnection" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ReviewRequestSettings" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ServiceAgreementSettings" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WinBackSettings" ALTER COLUMN "organizationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickBooksConnection" ADD CONSTRAINT "QuickBooksConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreementSettings" ADD CONSTRAINT "ServiceAgreementSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequestSettings" ADD CONSTRAINT "ReviewRequestSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminderSettings" ADD CONSTRAINT "InvoiceReminderSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNotificationSettings" ADD CONSTRAINT "JobNotificationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryReminderSettings" ADD CONSTRAINT "DeliveryReminderSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadOutreachSettings" ADD CONSTRAINT "LeadOutreachSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinBackSettings" ADD CONSTRAINT "WinBackSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

