-- CreateTable
CREATE TABLE "EquipmentLocationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentItemId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "customerId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentLocationEvent_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EquipmentLocationEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipmentPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'condition',
    "caption" TEXT,
    "filePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentPhoto_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EquipmentCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fieldDefinitions" TEXT NOT NULL DEFAULT '[]',
    "agingThresholdDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EquipmentCategory" ("createdAt", "description", "fieldDefinitions", "id", "name", "updatedAt") SELECT "createdAt", "description", "fieldDefinitions", "id", "name", "updatedAt" FROM "EquipmentCategory";
DROP TABLE "EquipmentCategory";
ALTER TABLE "new_EquipmentCategory" RENAME TO "EquipmentCategory";
CREATE UNIQUE INDEX "EquipmentCategory_name_key" ON "EquipmentCategory"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
