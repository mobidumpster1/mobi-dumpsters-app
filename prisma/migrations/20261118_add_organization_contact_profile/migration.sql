-- Per-business contact profile so the platform isn't tied to one business's
-- phone/inbox/time zone. Adds nullable columns (timeZone has a default);
-- no existing data changes.
ALTER TABLE "Organization" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "notificationEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/New_York';
