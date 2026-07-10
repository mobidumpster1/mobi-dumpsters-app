-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "email" TEXT,
ADD COLUMN     "lastEmailSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LeadEmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadEmailTemplate_pkey" PRIMARY KEY ("id")
);
