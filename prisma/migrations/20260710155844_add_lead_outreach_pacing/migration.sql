-- AlterTable
ALTER TABLE "LeadEmailSend" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "LeadOutreachSettings" (
    "id" TEXT NOT NULL,
    "dailySendCap" INTEGER NOT NULL DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadOutreachSettings_pkey" PRIMARY KEY ("id")
);
