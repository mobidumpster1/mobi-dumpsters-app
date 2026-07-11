-- DropIndex
DROP INDEX "EquipmentCategory_name_key";

-- DropIndex
DROP INDEX "PermitArea_name_key";

-- DropIndex
DROP INDEX "ServiceArea_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCategory_organizationId_name_key" ON "EquipmentCategory"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PermitArea_organizationId_name_key" ON "PermitArea"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceArea_organizationId_name_key" ON "ServiceArea"("organizationId", "name");

