-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "onlinePaymentSentAt" TIMESTAMP(3),
ADD COLUMN     "onlinePaymentUrl" TEXT;
