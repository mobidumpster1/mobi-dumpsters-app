-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "permitNumber" TEXT,
ADD COLUMN     "permitRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permitStatus" TEXT;

-- CreateTable
CREATE TABLE "PermitArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermitArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermitArea_name_key" ON "PermitArea"("name");
