ALTER TABLE "Organization" ADD COLUMN "customerFieldDefinitions" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Organization" ADD COLUMN "bookingFieldDefinitions" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Customer" ADD COLUMN "attributes" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Booking" ADD COLUMN "attributes" TEXT NOT NULL DEFAULT '{}';
