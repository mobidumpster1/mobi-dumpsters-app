CREATE TABLE "WebsiteBuilderPageVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sectionsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteBuilderPageVersion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WebsiteBuilderPageVersion" ADD CONSTRAINT "WebsiteBuilderPageVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
