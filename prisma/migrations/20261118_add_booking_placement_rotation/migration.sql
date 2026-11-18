-- The customer-marked placement spot now has a direction: which way the
-- container sits on the satellite map (degrees clockwise from north for its
-- long side). Nullable, so every existing booking is unaffected.
ALTER TABLE "Booking" ADD COLUMN "placementRotation" DOUBLE PRECISION;
