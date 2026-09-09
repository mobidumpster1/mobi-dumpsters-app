CREATE TABLE "TaxSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "ratePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxLabel" TEXT NOT NULL DEFAULT 'Sales Tax',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaxSettings_organizationId_key" ON "TaxSettings"("organizationId");

ALTER TABLE "TaxSettings" ADD CONSTRAINT "TaxSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
