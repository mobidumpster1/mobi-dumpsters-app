-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "googleCalendarEventId" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "latitude" REAL;
ALTER TABLE "Customer" ADD COLUMN "longitude" REAL;

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "caption" TEXT,
    "filePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
