-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "reviewRequestSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReviewRequestSettings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "googleReviewUrl" TEXT,
    "delayDays" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRequestSettings_pkey" PRIMARY KEY ("id")
);
