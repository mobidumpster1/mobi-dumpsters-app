-- CreateTable
CREATE TABLE "LeadEmailSend" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEmailSend_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeadEmailSend" ADD CONSTRAINT "LeadEmailSend_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEmailSend" ADD CONSTRAINT "LeadEmailSend_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LeadEmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
