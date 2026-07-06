-- AlterTable
ALTER TABLE "EquipmentCategory" ADD COLUMN     "bundleOfCategoryId" TEXT,
ADD COLUMN     "bundleQuantity" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "EquipmentCategory" ADD CONSTRAINT "EquipmentCategory_bundleOfCategoryId_fkey" FOREIGN KEY ("bundleOfCategoryId") REFERENCES "EquipmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
