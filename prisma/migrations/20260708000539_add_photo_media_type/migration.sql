-- AlterTable
ALTER TABLE "CustomerPhoto" ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'photo';

-- AlterTable
ALTER TABLE "EquipmentPhoto" ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'photo';

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'photo';
