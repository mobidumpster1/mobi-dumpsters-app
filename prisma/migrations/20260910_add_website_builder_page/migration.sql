CREATE TABLE "WebsiteBuilderPage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "canvasWidth" INTEGER NOT NULL DEFAULT 640,
    "canvasHeight" INTEGER NOT NULL DEFAULT 1200,
    "blocksJson" TEXT NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteBuilderPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteBuilderPage_organizationId_key" ON "WebsiteBuilderPage"("organizationId");

ALTER TABLE "WebsiteBuilderPage" ADD CONSTRAINT "WebsiteBuilderPage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
