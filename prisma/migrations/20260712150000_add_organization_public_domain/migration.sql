ALTER TABLE "Organization" ADD COLUMN "publicDomain" TEXT;
CREATE UNIQUE INDEX "Organization_publicDomain_key" ON "Organization"("publicDomain");
