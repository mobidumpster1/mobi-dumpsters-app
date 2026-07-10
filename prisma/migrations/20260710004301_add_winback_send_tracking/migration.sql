/*
  Warnings:

  - You are about to drop the column `lastWinBackEmailSentAt` on the `Customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "lastWinBackEmailSentAt";

-- CreateTable
CREATE TABLE "WinBackSend" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WinBackSend_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WinBackSend" ADD CONSTRAINT "WinBackSend_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinBackSend" ADD CONSTRAINT "WinBackSend_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WinBackEmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
