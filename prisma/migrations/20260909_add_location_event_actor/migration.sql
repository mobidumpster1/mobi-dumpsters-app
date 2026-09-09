ALTER TABLE "EquipmentLocationEvent" ADD COLUMN "movedByUserId" TEXT;

ALTER TABLE "EquipmentLocationEvent" ADD CONSTRAINT "EquipmentLocationEvent_movedByUserId_fkey" FOREIGN KEY ("movedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
