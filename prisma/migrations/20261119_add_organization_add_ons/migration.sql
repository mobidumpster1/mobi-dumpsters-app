-- Paid add-ons (AI Secretary, AI phone agent) are switched on per business.
ALTER TABLE "Organization" ADD COLUMN "enabledAddOns" TEXT NOT NULL DEFAULT '';
