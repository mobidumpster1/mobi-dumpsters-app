import { db } from "@/lib/db";
import { pushInvoicePayment } from "@/lib/quickbooks";

const MS_PER_DAY = 86_400_000;

type BookingItemForPricing = {
  id: string;
  startDate: Date;
  expectedReturnDate: Date;
  actualReturnDate: Date | null;
  actualTonnage: number | null;
  actualMileage: number | null;
  price: number;
  equipmentItem: {
    label: string;
    category: {
      basePrice: number | null;
      includedDays: number | null;
      overageDayRate: number | null;
      includedTonnage: number | null;
      overageTonnageRate: number | null;
      includedMileage: number | null;
      overageMileageRate: number | null;
    };
  };
};

export type ComputedLineItem = {
  description: string;
  amount: number;
  type: string;
};

// Turns a booking's items into invoice line items using each item's
// category pricing rules and actual usage. Falls back to the manually
// entered BookingItem.price as a single base line when a category has no
// pricing rules configured, so existing bookings keep working unchanged.
export function computeInvoiceLineItems(
  items: BookingItemForPricing[]
): ComputedLineItem[] {
  const lines: ComputedLineItem[] = [];

  for (const item of items) {
    const category = item.equipmentItem.category;

    if (category.basePrice === null) {
      lines.push({
        description: item.equipmentItem.label,
        amount: item.price,
        type: "base",
      });
      continue;
    }

    lines.push({
      description: `${item.equipmentItem.label} — Base Rental`,
      amount: category.basePrice,
      type: "base",
    });

    if (category.includedDays !== null && category.overageDayRate !== null) {
      const endDate = item.actualReturnDate ?? item.expectedReturnDate;
      const actualDays = Math.ceil(
        (endDate.getTime() - item.startDate.getTime()) / MS_PER_DAY
      );
      const extraDays = Math.max(0, actualDays - category.includedDays);
      if (extraDays > 0) {
        lines.push({
          description: `${item.equipmentItem.label} — Extra Days (${extraDays} × $${category.overageDayRate.toFixed(2)})`,
          amount: extraDays * category.overageDayRate,
          type: "overage_days",
        });
      }
    }

    if (
      category.includedTonnage !== null &&
      category.overageTonnageRate !== null &&
      item.actualTonnage !== null
    ) {
      const extraTons = Math.max(0, item.actualTonnage - category.includedTonnage);
      if (extraTons > 0) {
        lines.push({
          description: `${item.equipmentItem.label} — Extra Tonnage (${extraTons.toFixed(2)} tons × $${category.overageTonnageRate.toFixed(2)})`,
          amount: extraTons * category.overageTonnageRate,
          type: "overage_tonnage",
        });
      }
    }

    if (
      category.includedMileage !== null &&
      category.overageMileageRate !== null &&
      item.actualMileage !== null
    ) {
      const extraMiles = Math.max(0, item.actualMileage - category.includedMileage);
      if (extraMiles > 0) {
        lines.push({
          description: `${item.equipmentItem.label} — Extra Mileage (${extraMiles.toFixed(1)} mi × $${category.overageMileageRate.toFixed(2)})`,
          amount: extraMiles * category.overageMileageRate,
          type: "overage_mileage",
        });
      }
    }
  }

  return lines;
}

// Derives the next number from the highest existing INV-#### number rather
// than a row count, since a count drifts out of sync with the sequence
// whenever an invoice is deleted (or historical HIST-#### rows exist
// alongside it), which caused collisions with already-used numbers.
export async function nextInvoiceNumber(organizationId: string): Promise<string> {
  const invoices = await db.invoice.findMany({
    where: { organizationId, invoiceNumber: { startsWith: "INV-" } },
    select: { invoiceNumber: true },
  });
  const maxNumber = invoices.reduce((max, invoice) => {
    const n = parseInt(invoice.invoiceNumber.slice(4), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `INV-${String(maxNumber + 1).padStart(4, "0")}`;
}

// Creates a draft invoice with computed line items for a booking, unless
// one already exists. Used both by auto-generation on job completion and
// by the manual "Create Invoice" button.
export async function createDraftInvoiceForBooking(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      items: { include: { equipmentItem: { include: { category: true } } } },
    },
  });

  const existing = await db.invoice.findFirst({
    where: { bookingId, organizationId: booking.organizationId },
  });
  if (existing) return existing;

  const lines = computeInvoiceLineItems(booking.items);
  const amount = lines.reduce((sum, line) => sum + line.amount, 0);
  const invoiceNumber = await nextInvoiceNumber(booking.organizationId);

  return db.invoice.create({
    data: {
      organizationId: booking.organizationId,
      bookingId,
      invoiceNumber,
      amount,
      status: "unpaid",
      lineItems: { create: lines },
    },
  });
}

// Marks an invoice paid after a successful Stripe charge and pushes the
// payment to QuickBooks — the same pushInvoicePayment call markPaid makes
// for a manually-recorded payment, just triggered by Stripe instead of a
// staff member filling in a form. Shared between the "Charge Card on
// File" action (the primary path) and the Stripe webhook (a
// belt-and-suspenders backstop in case the direct call never completes —
// e.g. the server crashes between the charge succeeding and this
// running). Idempotent: a no-op if the invoice is already marked paid, so
// it's safe for both paths to call this for the same charge.
export async function markInvoicePaidViaStripe(
  invoiceId: string,
  organizationId: string,
  paymentIntentId: string
) {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      booking: {
        include: { customer: true, items: { include: { equipmentItem: true } } },
      },
      customer: true,
    },
  });
  if (!invoice || invoice.status === "paid") return;

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "paid",
      paidDate: new Date(),
      paymentMethod: "Stripe",
      stripePaymentIntentId: paymentIntentId,
    },
  });

  const customer = invoice.booking?.customer ?? invoice.customer;
  if (!customer) return;

  try {
    const result = await pushInvoicePayment({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        quickbooksCustomerId: customer.quickbooksCustomerId,
      },
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      issueDate: invoice.issueDate,
      description:
        invoice.booking?.items.map((item) => item.equipmentItem.label).join(", ") ??
        invoice.invoiceNumber,
      existingQboInvoiceId: invoice.quickbooksInvoiceId,
      organizationId,
    });

    if (result) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { quickbooksInvoiceId: result.invoiceId, quickbooksPaymentId: result.paymentId },
      });
    }
  } catch (error) {
    // A QuickBooks hiccup shouldn't undo the invoice already being paid.
    console.error("Failed to push Stripe payment to QuickBooks:", error);
  }
}

// Same shape as markInvoicePaidViaStripe, but for one scheduled
// installment rather than the whole invoice — marks the installment paid,
// recomputes Invoice.status from the paid-installment total (unpaid ->
// partial -> paid), and pushes just this installment's amount to
// QuickBooks (pushInvoicePayment already accepts an explicit amount, so
// no changes needed there). Idempotent for the same reason
// markInvoicePaidViaStripe is: safe for both the direct charge call and
// the webhook backstop to call for the same PaymentIntent.
export async function markInstallmentPaidViaStripe(
  installmentId: string,
  organizationId: string,
  paymentIntentId: string
) {
  const installment = await db.invoiceInstallment.findFirst({
    where: { id: installmentId, invoice: { organizationId } },
    include: {
      invoice: {
        include: {
          booking: { include: { customer: true, items: { include: { equipmentItem: true } } } },
          customer: true,
        },
      },
    },
  });
  if (!installment || installment.status === "paid") return;

  await db.invoiceInstallment.update({
    where: { id: installment.id },
    data: {
      status: "paid",
      paidDate: new Date(),
      paymentMethod: "Stripe",
      stripePaymentIntentId: paymentIntentId,
    },
  });

  const siblings = await db.invoiceInstallment.findMany({ where: { invoiceId: installment.invoiceId } });
  const allPaid = siblings.every((i) => i.id === installment.id || i.status === "paid");
  const methods = new Set(
    siblings.map((i) => (i.id === installment.id ? "Stripe" : i.paymentMethod)).filter(Boolean)
  );
  await db.invoice.update({
    where: { id: installment.invoiceId },
    data: {
      status: allPaid ? "paid" : "partial",
      paidDate: allPaid ? new Date() : null,
      paymentMethod: allPaid ? (methods.size === 1 ? [...methods][0] : "Multiple") : null,
    },
  });

  const invoice = installment.invoice;
  const customer = invoice.booking?.customer ?? invoice.customer;
  if (!customer) return;

  try {
    const result = await pushInvoicePayment({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        quickbooksCustomerId: customer.quickbooksCustomerId,
      },
      invoiceNumber: invoice.invoiceNumber,
      amount: installment.amount,
      issueDate: invoice.issueDate,
      description: `${invoice.booking?.items.map((item) => item.equipmentItem.label).join(", ") ?? invoice.invoiceNumber} — ${installment.label}`,
      existingQboInvoiceId: invoice.quickbooksInvoiceId,
      organizationId,
    });

    if (result) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { quickbooksInvoiceId: result.invoiceId, quickbooksPaymentId: result.paymentId },
      });
    }
  } catch (error) {
    // A QuickBooks hiccup shouldn't undo the installment already being paid.
    console.error("Failed to push Stripe installment payment to QuickBooks:", error);
  }
}
