ALTER TABLE "PlatformSubscription" ADD COLUMN "paymentFailedAt" TIMESTAMP(3);

CREATE TABLE "ProcessedPlatformWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedPlatformWebhookEvent_pkey" PRIMARY KEY ("id")
);
