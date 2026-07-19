-- CreateTable
CREATE TABLE "GoogleAdsConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "loginCustomerId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAdsConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdsPerformance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdsPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsConnection_organizationId_key" ON "GoogleAdsConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdsPerformance_organizationId_campaignId_date_key" ON "AdsPerformance"("organizationId", "campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingRecommendation_organizationId_source_type_relatedE_key" ON "MarketingRecommendation"("organizationId", "source", "type", "relatedEntityId");

-- AddForeignKey
ALTER TABLE "GoogleAdsConnection" ADD CONSTRAINT "GoogleAdsConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdsPerformance" ADD CONSTRAINT "AdsPerformance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingRecommendation" ADD CONSTRAINT "MarketingRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
