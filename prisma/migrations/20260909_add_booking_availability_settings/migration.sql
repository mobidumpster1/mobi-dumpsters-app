CREATE TABLE "BookingAvailabilitySettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "awayModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "awayModeMessage" TEXT NOT NULL DEFAULT 'We''re not accepting online booking requests right now — please call us.',
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAvailabilitySettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingAvailabilitySettings_organizationId_key" ON "BookingAvailabilitySettings"("organizationId");

ALTER TABLE "BookingAvailabilitySettings" ADD CONSTRAINT "BookingAvailabilitySettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BlackoutDate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlackoutDate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BlackoutDate" ADD CONSTRAINT "BlackoutDate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
