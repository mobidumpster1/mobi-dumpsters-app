CREATE TABLE "DumpScheduleSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "openHour" INTEGER NOT NULL DEFAULT 7,
    "closeHour" INTEGER NOT NULL DEFAULT 17,
    "openSunday" BOOLEAN NOT NULL DEFAULT false,
    "openMonday" BOOLEAN NOT NULL DEFAULT true,
    "openTuesday" BOOLEAN NOT NULL DEFAULT true,
    "openWednesday" BOOLEAN NOT NULL DEFAULT true,
    "openThursday" BOOLEAN NOT NULL DEFAULT true,
    "openFriday" BOOLEAN NOT NULL DEFAULT true,
    "openSaturday" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DumpScheduleSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DumpScheduleSettings_organizationId_key" ON "DumpScheduleSettings"("organizationId");

ALTER TABLE "DumpScheduleSettings" ADD CONSTRAINT "DumpScheduleSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
