CREATE TABLE "WebsiteSnippet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSnippet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteSnippet_organizationId_name_key" ON "WebsiteSnippet"("organizationId", "name");

ALTER TABLE "WebsiteSnippet" ADD CONSTRAINT "WebsiteSnippet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
