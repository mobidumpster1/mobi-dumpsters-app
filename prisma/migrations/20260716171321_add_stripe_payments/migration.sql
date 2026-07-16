CREATE TABLE "StripeConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "publishableKey" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeConnection_organizationId_key" ON "StripeConnection"("organizationId");

ALTER TABLE "StripeConnection" ADD CONSTRAINT "StripeConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Customer" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "stripePaymentMethodId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "stripeCardBrand" TEXT;
ALTER TABLE "Customer" ADD COLUMN "stripeCardLast4" TEXT;

ALTER TABLE "Invoice" ADD COLUMN "stripePaymentIntentId" TEXT;
