import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const alerts: { subject: string; body: string }[] = [];
vi.mock("@/lib/email", () => ({
  siteOrigin: () => "http://localhost",
  sendCustomerEmail: async () => undefined,
  sendNotificationEmail: async (subject: string, body: string) => {
    alerts.push({ subject, body });
  },
}));

import { db } from "@/lib/db";
import { markInvoicePaidViaStripe, payInFullProblem } from "@/lib/invoicing";
import { ACME_ORG_ID, cleanupTestFixtures, testId } from "../helpers/testOrg";

// A Stripe payment is only recorded as "paid in full" when the amount really
// matches the invoice. A different amount, or a second payment on an invoice
// that is already paid, is flagged for the owner instead of being swallowed.
// Acme test business only.

const NUM = "vitest-stripechk";
let customerId = "";

async function makeInvoice(label: string, amount: number, status = "unpaid") {
  return db.invoice.create({
    data: {
      organizationId: ACME_ORG_ID,
      customerId,
      invoiceNumber: `${NUM}-${label}-${Date.now()}`,
      amount,
      status,
    },
  });
}
const reload = (id: string) => db.invoice.findUniqueOrThrow({ where: { id } });

beforeAll(async () => {
  const customer = await db.customer.create({ data: { organizationId: ACME_ORG_ID, name: testId("stripechk-customer") } });
  customerId = customer.id;
});

afterAll(async () => {
  await db.invoice.deleteMany({ where: { organizationId: ACME_ORG_ID, invoiceNumber: { startsWith: NUM } } });
  await cleanupTestFixtures();
});

describe("pay-in-full guard", () => {
  it("refuses paid invoices and invoices on a payment plan", () => {
    expect(payInFullProblem({ status: "paid", installments: [] })).toMatch(/already paid/);
    expect(payInFullProblem({ status: "unpaid", installments: [{}] })).toMatch(/payment plan/);
    expect(payInFullProblem({ status: "unpaid", installments: [] })).toBeNull();
    expect(payInFullProblem({ status: "partial", installments: [] })).toBeNull();
  });
});

describe("Stripe payments reaching an invoice", () => {
  it("marks it paid when the amount matches", async () => {
    const inv = await makeInvoice("ok", 400);
    await markInvoicePaidViaStripe(inv.id, ACME_ORG_ID, "pi_test_ok", 40000);
    const after = await reload(inv.id);
    expect(after.status).toBe("paid");
    expect(after.stripePaymentIntentId).toBe("pi_test_ok");
  });

  it("does NOT mark it paid when Stripe collected a different amount, and tells the owner once", async () => {
    alerts.length = 0;
    const inv = await makeInvoice("short", 450);
    await markInvoicePaidViaStripe(inv.id, ACME_ORG_ID, "pi_test_short", 40000);
    await markInvoicePaidViaStripe(inv.id, ACME_ORG_ID, "pi_test_short", 40000); // redelivered event
    const after = await reload(inv.id);
    expect(after.status).toBe("unpaid");
    expect(after.stripePaymentIntentId).toBeNull();
    expect(after.notes).toContain("pi_test_short");
    expect(after.notes).toContain("$400.00");
    expect(after.notes).toContain("$450.00");
    expect(alerts.filter((a) => a.subject.includes(inv.invoiceNumber))).toHaveLength(1);
  });

  it("flags a second payment on an invoice that is already paid, but not the same payment arriving twice", async () => {
    alerts.length = 0;
    const inv = await makeInvoice("dupe", 400);
    await markInvoicePaidViaStripe(inv.id, ACME_ORG_ID, "pi_first", 40000);
    await markInvoicePaidViaStripe(inv.id, ACME_ORG_ID, "pi_first", 40000); // same payment again: nothing to flag
    expect(alerts).toHaveLength(0);

    await markInvoicePaidViaStripe(inv.id, ACME_ORG_ID, "pi_second", 40000);
    const after = await reload(inv.id);
    expect(after.status).toBe("paid");
    expect(after.stripePaymentIntentId).toBe("pi_first");
    expect(after.notes).toContain("already paid");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].body).toContain("paid twice");
  });

  it("direct charges that don't pass an amount behave as before", async () => {
    const inv = await makeInvoice("direct", 275);
    await markInvoicePaidViaStripe(inv.id, ACME_ORG_ID, "pi_direct");
    expect((await reload(inv.id)).status).toBe("paid");
  });
});
