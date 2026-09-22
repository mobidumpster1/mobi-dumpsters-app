-- T070: there was no way to actually refund a paid installment through
-- Stripe — refundInvoicePayment only reads Invoice.stripePaymentIntentId,
-- which is never set for installment-based invoices.
ALTER TABLE "InvoiceInstallment" ADD COLUMN "refundedAmount" DOUBLE PRECISION, ADD COLUMN "refundedAt" TIMESTAMP(3);
