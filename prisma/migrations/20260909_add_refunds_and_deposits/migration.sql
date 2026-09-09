ALTER TABLE "Invoice" ADD COLUMN "refundedAmount" DOUBLE PRECISION;
ALTER TABLE "Invoice" ADD COLUMN "refundedAt" TIMESTAMP(3);

ALTER TABLE "EquipmentCategory" ADD COLUMN "securityDepositAmount" DOUBLE PRECISION;

ALTER TABLE "Booking" ADD COLUMN "depositAmount" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "depositReleasedAmount" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "depositReleasedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "depositNote" TEXT;
