-- T078: neither the SetupIntent's own ID nor a confirmation timestamp
-- was kept anywhere, so a disputed off-session charge had no independent
-- record of the customer's own authorization to point to.
ALTER TABLE "Customer" ADD COLUMN "stripeSetupIntentId" TEXT, ADD COLUMN "cardOnFileConfirmedAt" TIMESTAMP(3);
