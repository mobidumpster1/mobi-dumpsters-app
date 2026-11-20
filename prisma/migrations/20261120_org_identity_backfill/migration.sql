-- Each business now owns its identity (logo, color, phone, address) instead of
-- every business falling back to the original business's config file.
ALTER TABLE "Organization" ADD COLUMN "contactAddress" TEXT;

-- The original business (Mobi Dumpsters, identified by its booking domain) kept
-- its identity only in config/branding.json. Copy it onto its own row so it
-- looks exactly the same once that fallback is removed. Fields it has already
-- set itself are left alone.
UPDATE "Organization"
SET "logoUrl"        = COALESCE("logoUrl", '/logo.JPEG'),
    "primaryColor"   = COALESCE("primaryColor", '#3f6b2f'),
    "contactPhone"   = COALESCE("contactPhone", '(478) 954-3387'),
    "contactAddress" = COALESCE("contactAddress", 'Byron, GA')
WHERE "publicDomain" = 'book.mobidumpsters.com';
