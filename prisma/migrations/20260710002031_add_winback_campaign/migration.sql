-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "lastWinBackEmailSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WinBackEmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WinBackEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WinBackSettings" (
    "id" TEXT NOT NULL,
    "lapsedDays" INTEGER NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WinBackSettings_pkey" PRIMARY KEY ("id")
);
