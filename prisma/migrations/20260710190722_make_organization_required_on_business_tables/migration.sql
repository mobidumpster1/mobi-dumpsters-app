/*
  Warnings:

  - Made the column `organizationId` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Document` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `EmailSequence` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `EquipmentCategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `EquipmentItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `GalleryPhoto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Lead` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `LeadEmailTemplate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `MileageLogEntry` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `PermitArea` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `PlacesSearchLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `RecurringBill` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `ServiceArea` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Vehicle` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `WinBackEmailTemplate` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "EmailSequence" DROP CONSTRAINT "EmailSequence_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "EquipmentCategory" DROP CONSTRAINT "EquipmentCategory_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "EquipmentItem" DROP CONSTRAINT "EquipmentItem_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "GalleryPhoto" DROP CONSTRAINT "GalleryPhoto_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "LeadEmailTemplate" DROP CONSTRAINT "LeadEmailTemplate_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "MileageLogEntry" DROP CONSTRAINT "MileageLogEntry_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PermitArea" DROP CONSTRAINT "PermitArea_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PlacesSearchLog" DROP CONSTRAINT "PlacesSearchLog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringBill" DROP CONSTRAINT "RecurringBill_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceArea" DROP CONSTRAINT "ServiceArea_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WinBackEmailTemplate" DROP CONSTRAINT "WinBackEmailTemplate_organizationId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "EmailSequence" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "EquipmentCategory" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "EquipmentItem" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "GalleryPhoto" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LeadEmailTemplate" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MileageLogEntry" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PermitArea" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PlacesSearchLog" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecurringBill" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ServiceArea" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WinBackEmailTemplate" ALTER COLUMN "organizationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCategory" ADD CONSTRAINT "EquipmentCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MileageLogEntry" ADD CONSTRAINT "MileageLogEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacesSearchLog" ADD CONSTRAINT "PlacesSearchLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSequence" ADD CONSTRAINT "EmailSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEmailTemplate" ADD CONSTRAINT "LeadEmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinBackEmailTemplate" ADD CONSTRAINT "WinBackEmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitArea" ADD CONSTRAINT "PermitArea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
