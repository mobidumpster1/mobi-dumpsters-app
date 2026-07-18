"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { markInstallmentPaidViaStripe } from "@/lib/invoicing";
import { chargeCardOnFile, createCheckoutSession, toCents } from "@/lib/stripe";
import { sendCustomerEmail, siteOrigin } from "@/lib/email";
import { branding } from "@/lib/branding";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

type InstallmentInput = { label: string; amount: string; dueDate: string };

export async function createPaymentSchedule(invoiceId: string, formData: FormData) {
  const user = await requirePermission("canManageInvoices");

  const invoice = await db.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId: user.effectiveOrganizationId },
    include: { installments: true },
  });
  if (invoice.status === "paid") {
    throw new Error("This invoice is already paid in full.");
  }
  if (invoice.installments.length > 0) {
    throw new Error("This invoice already has a payment schedule.");
  }

  const rawJson = formData.get("installmentsJson");
  const rawInstallments: InstallmentInput[] = typeof rawJson === "string" ? JSON.parse(rawJson) : [];
  const installments = rawInstallments
    .filter((i) => i.label && Number(i.amount) > 0)
    .map((i) => ({
      label: i.label,
      amount: Number(i.amount),
      dueDate: i.dueDate ? new Date(i.dueDate) : null,
    }));

  if (installments.length === 0) {
    throw new Error("Add at least one scheduled payment.");
  }

  const total = installments.reduce((sum, i) => sum + i.amount, 0);
  if (Math.abs(total - invoice.amount) > 0.01) {
    throw new Error(
      `Scheduled payments total $${total.toFixed(2)}, but the invoice is $${invoice.amount.toFixed(2)} — they need to match.`
    );
  }

  await db.invoiceInstallment.createMany({
    data: installments.map((i) => ({ invoiceId, ...i })),
  });
  await db.invoice.update({ where: { id: invoiceId }, data: { status: "partial" } });

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInstallment(installmentId: string) {
  const user = await requirePermission("canManageInvoices");

  const installment = await db.invoiceInstallment.findFirstOrThrow({
    where: { id: installmentId, invoice: { organizationId: user.effectiveOrganizationId } },
  });
  if (installment.status === "paid") {
    throw new Error("Can't delete a payment that's already been collected.");
  }

  await db.invoiceInstallment.delete({ where: { id: installmentId } });

  const remaining = await db.invoiceInstallment.count({ where: { invoiceId: installment.invoiceId } });
  if (remaining === 0) {
    await db.invoice.update({ where: { id: installment.invoiceId }, data: { status: "unpaid" } });
  }

  revalidatePath(`/invoices/${installment.invoiceId}`);
}

export async function markInstallmentPaid(installmentId: string, formData: FormData) {
  const user = await requirePermission("canManageInvoices");

  await db.invoiceInstallment.findFirstOrThrow({
    where: { id: installmentId, invoice: { organizationId: user.effectiveOrganizationId } },
  });
  const installment = await db.invoiceInstallment.update({
    where: { id: installmentId },
    data: {
      status: "paid",
      paidDate: new Date(),
      paymentMethod: (formData.get("paymentMethod") as string) || null,
    },
  });

  await syncInvoiceStatusFromInstallments(installment.invoiceId);
  revalidatePath(`/invoices/${installment.invoiceId}`);
}

export async function markInstallmentUnpaid(installmentId: string) {
  const user = await requirePermission("canManageInvoices");

  await db.invoiceInstallment.findFirstOrThrow({
    where: { id: installmentId, invoice: { organizationId: user.effectiveOrganizationId } },
  });
  const installment = await db.invoiceInstallment.update({
    where: { id: installmentId },
    data: { status: "pending", paidDate: null, paymentMethod: null },
  });

  await syncInvoiceStatusFromInstallments(installment.invoiceId);
  revalidatePath(`/invoices/${installment.invoiceId}`);
}

async function syncInvoiceStatusFromInstallments(invoiceId: string) {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { installments: true },
  });
  const allPaid = invoice.installments.every((i) => i.status === "paid");
  const anyPaid = invoice.installments.some((i) => i.status === "paid");
  const methods = new Set(invoice.installments.map((i) => i.paymentMethod).filter(Boolean));

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: allPaid ? "paid" : anyPaid ? "partial" : "unpaid",
      paidDate: allPaid ? new Date() : null,
      paymentMethod: allPaid ? (methods.size === 1 ? [...methods][0] : "Multiple") : null,
    },
  });
}

// Charges the customer's card on file for one scheduled installment — the
// same chargeCardOnFile wrapper the full-invoice charge uses, just with
// the installment's amount and an installmentId in the metadata so the
// webhook (and markInstallmentPaidViaStripe) know which row to update.
export async function chargeInstallmentViaStripe(installmentId: string) {
  const user = await requirePermission("canManageInvoices");

  const installment = await db.invoiceInstallment.findFirstOrThrow({
    where: { id: installmentId, invoice: { organizationId: user.effectiveOrganizationId } },
    include: { invoice: { include: { booking: { include: { customer: true } }, customer: true } } },
  });

  const customer = installment.invoice.booking?.customer ?? installment.invoice.customer;
  if (!customer) {
    throw new Error("This invoice has no customer to charge.");
  }

  const { paymentIntentId } = await chargeCardOnFile(
    user.effectiveOrganizationId,
    { stripeCustomerId: customer.stripeCustomerId, stripePaymentMethodId: customer.stripePaymentMethodId },
    toCents(installment.amount),
    `Invoice ${installment.invoice.invoiceNumber} — ${installment.label}`,
    { invoiceId: installment.invoiceId, installmentId: installment.id }
  );

  await markInstallmentPaidViaStripe(installment.id, user.effectiveOrganizationId, paymentIntentId);
  await logAction("invoice.installment_charged_stripe", "InvoiceInstallment", installmentId);
  revalidatePath(`/invoices/${installment.invoiceId}`);
}

export async function sendInstallmentCheckoutLink(installmentId: string) {
  const user = await requirePermission("canManageInvoices");

  const installment = await db.invoiceInstallment.findFirstOrThrow({
    where: { id: installmentId, invoice: { organizationId: user.effectiveOrganizationId } },
    include: { invoice: { include: { booking: { include: { customer: true } }, customer: true } } },
  });

  const customer = installment.invoice.booking?.customer ?? installment.invoice.customer;
  if (!customer?.email) {
    throw new Error("This customer has no email on file — add one before sending a payment link.");
  }

  const result = await createCheckoutSession(
    user.effectiveOrganizationId,
    { id: customer.id, name: customer.name, email: customer.email, stripeCustomerId: customer.stripeCustomerId },
    toCents(installment.amount),
    `Invoice ${installment.invoice.invoiceNumber} — ${installment.label}`,
    `${siteOrigin()}/invoices/${installment.invoiceId}`,
    `${siteOrigin()}/invoices/${installment.invoiceId}`,
    { invoiceId: installment.invoiceId, installmentId: installment.id }
  );

  if (!result) {
    throw new Error("Connect Stripe in Settings before sending payment links.");
  }

  await sendCustomerEmail(
    customer.email,
    `Pay your invoice ${installment.invoice.invoiceNumber} online`,
    [
      `Hi ${customer.name},`,
      "",
      `You can pay the "${installment.label}" installment ($${installment.amount.toFixed(2)}) on invoice ${installment.invoice.invoiceNumber} online here:`,
      "",
      result.url,
      "",
      `Thanks,`,
      `- ${branding.businessName}`,
    ].join("\n")
  );

  revalidatePath(`/invoices/${installment.invoiceId}`);
}
