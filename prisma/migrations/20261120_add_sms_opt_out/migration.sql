-- Phone numbers that texted STOP to a business, so nothing is texted to them
-- again until they text START.
CREATE TABLE "SmsOptOut" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phoneLast10" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsOptOut_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsOptOut_organizationId_phoneLast10_key" ON "SmsOptOut"("organizationId", "phoneLast10");

ALTER TABLE "SmsOptOut" ADD CONSTRAINT "SmsOptOut_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
