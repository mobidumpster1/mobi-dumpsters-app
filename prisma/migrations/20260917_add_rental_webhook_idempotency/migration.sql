-- T066/T067: the rental-payment webhook had no idempotency guard, unlike
-- the platform-billing webhook's existing ProcessedPlatformWebhookEvent
-- table. Same simple pattern, applied here.
CREATE TABLE "ProcessedRentalWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedRentalWebhookEvent_pkey" PRIMARY KEY ("id")
);
