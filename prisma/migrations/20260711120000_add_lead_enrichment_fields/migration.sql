-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "enrichedAt" TIMESTAMP(3);
