ALTER TABLE "Quote" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "DemolitionAgreement" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Backfill any currently-open (still "sent") link with a fresh 30-day
-- window starting now, not from its original send date — a link sent
-- months ago that's still legitimately open shouldn't be retroactively
-- expired out from under a customer the moment this ships.
UPDATE "Quote" SET "expiresAt" = NOW() + INTERVAL '30 days' WHERE "status" = 'sent' AND "expiresAt" IS NULL;
UPDATE "DemolitionAgreement" SET "expiresAt" = NOW() + INTERVAL '30 days' WHERE "status" = 'sent' AND "expiresAt" IS NULL;
