-- T093: QuickBooks sync failures were only ever logged to the server
-- console, invisible anywhere in the app. Same lastSyncedAt/lastSyncError
-- pattern GoogleAdsConnection already used.
ALTER TABLE "QuickBooksConnection" ADD COLUMN "lastSyncedAt" TIMESTAMP(3), ADD COLUMN "lastSyncError" TEXT;
