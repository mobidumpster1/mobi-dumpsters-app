-- CreateTable
CREATE TABLE "DemolitionAgreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "bookingId" TEXT,
    "customerId" TEXT,
    "structureDescription" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "dimensions" TEXT,
    "foundationRemovalIncluded" BOOLEAN NOT NULL DEFAULT false,
    "quotedPrice" DOUBLE PRECISION NOT NULL,
    "depositDue" DOUBLE PRECISION,
    "balanceDue" DOUBLE PRECISION,
    "staffSignerName" TEXT NOT NULL,
    "staffSignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "serviceDate" TIMESTAMP(3),
    "serviceAddress" TEXT,
    "signerIpAddress" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemolitionAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemolitionAgreement_publicToken_key" ON "DemolitionAgreement"("publicToken");

-- AddForeignKey
ALTER TABLE "DemolitionAgreement" ADD CONSTRAINT "DemolitionAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemolitionAgreement" ADD CONSTRAINT "DemolitionAgreement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemolitionAgreement" ADD CONSTRAINT "DemolitionAgreement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
