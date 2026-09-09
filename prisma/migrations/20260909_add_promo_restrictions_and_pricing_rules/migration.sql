ALTER TABLE "PromoCode" ADD COLUMN "minimumSpend" DOUBLE PRECISION;
ALTER TABLE "PromoCode" ADD COLUMN "restrictedCategoryId" TEXT;
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_restrictedCategoryId_fkey" FOREIGN KEY ("restrictedCategoryId") REFERENCES "EquipmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "adjustmentValue" DOUBLE PRECISION NOT NULL,
    "appliesSaturday" BOOLEAN NOT NULL DEFAULT false,
    "appliesSunday" BOOLEAN NOT NULL DEFAULT false,
    "seasonStartMonth" INTEGER,
    "seasonStartDay" INTEGER,
    "seasonEndMonth" INTEGER,
    "seasonEndDay" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
