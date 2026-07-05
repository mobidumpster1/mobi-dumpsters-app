-- AlterTable
ALTER TABLE "BookingItem" ADD COLUMN "actualMileage" REAL;
ALTER TABLE "BookingItem" ADD COLUMN "actualTonnage" REAL;

-- AlterTable
ALTER TABLE "EquipmentCategory" ADD COLUMN "basePrice" REAL;
ALTER TABLE "EquipmentCategory" ADD COLUMN "includedDays" INTEGER;
ALTER TABLE "EquipmentCategory" ADD COLUMN "includedMileage" REAL;
ALTER TABLE "EquipmentCategory" ADD COLUMN "includedTonnage" REAL;
ALTER TABLE "EquipmentCategory" ADD COLUMN "overageDayRate" REAL;
ALTER TABLE "EquipmentCategory" ADD COLUMN "overageMileageRate" REAL;
ALTER TABLE "EquipmentCategory" ADD COLUMN "overageTonnageRate" REAL;

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
