CREATE TABLE "JobPhotoNotificationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhotoNotificationSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobPhotoNotificationSettings_organizationId_key" ON "JobPhotoNotificationSettings"("organizationId");

ALTER TABLE "JobPhotoNotificationSettings" ADD CONSTRAINT "JobPhotoNotificationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
