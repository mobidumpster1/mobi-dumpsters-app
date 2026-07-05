-- CreateTable
CREATE TABLE "ServiceAgreementSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Service & Rental Agreement',
    "content" TEXT NOT NULL DEFAULT '[Placeholder — replace this with your real service agreement text in Settings before sharing with customers. Consider having a lawyer review it.]',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SignedAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agreementTitle" TEXT NOT NULL,
    "agreementText" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT,
    "signerPhone" TEXT,
    "ipAddress" TEXT,
    "agreedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT,
    "bookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignedAgreement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SignedAgreement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
