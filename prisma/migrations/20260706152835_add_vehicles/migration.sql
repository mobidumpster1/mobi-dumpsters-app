-- DropForeignKey
ALTER TABLE "MileageLogEntry" DROP CONSTRAINT "MileageLogEntry_equipmentItemId_fkey";

-- AlterTable
ALTER TABLE "MileageLogEntry" ADD COLUMN     "vehicleId" TEXT,
ALTER COLUMN "equipmentItemId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MileageLogEntry" ADD CONSTRAINT "MileageLogEntry_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MileageLogEntry" ADD CONSTRAINT "MileageLogEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
