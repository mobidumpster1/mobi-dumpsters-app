CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "resendMessageId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDeliveryLog_resendMessageId_key" ON "EmailDeliveryLog"("resendMessageId");

ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
