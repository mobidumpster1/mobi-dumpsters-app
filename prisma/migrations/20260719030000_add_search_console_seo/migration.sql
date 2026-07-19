-- CreateTable
CREATE TABLE "SearchConsoleConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchConsoleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoPerformance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "query" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceArea" TEXT,
    "serviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchConsoleConnection_organizationId_key" ON "SearchConsoleConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoPerformance_organizationId_weekStart_query_page_key" ON "SeoPerformance"("organizationId", "weekStart", "query", "page");

-- AddForeignKey
ALTER TABLE "SearchConsoleConnection" ADD CONSTRAINT "SearchConsoleConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoPerformance" ADD CONSTRAINT "SeoPerformance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
