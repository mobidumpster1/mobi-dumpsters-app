import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression test for T112-T114: a real, live cross-tenant data leak found
// and fixed during the September 2026 audit. src/app/book/thank-you/page.tsx
// (and payBookingInvoiceNow/confirmCardSetup in src/app/book/actions.ts)
// used to look up a client-supplied invoiceId with db.invoice.findUnique —
// which, because it's a unique-id lookup, is structurally exempt from the
// tenantGuard extension (see tenantGuard.ts's own comment on
// GUARDED_OPERATIONS). Anyone holding a valid invoice id from ANY tenant
// could read that invoice's amount and the customer's name/email/phone.
// The fix was switching to findFirst with organizationId in `where`. This
// test creates its own second, throwaway organization (deleted in
// afterAll) so it can prove the exact cross-tenant scenario without ever
// touching the real Mobi Dumpsters org.
describe("cross-tenant invoice lookup (T112-T114 regression)", () => {
  const otherOrgId = { current: "" };
  const acmeInvoiceId = { current: "" };
  const otherOrgInvoiceId = { current: "" };

  beforeAll(async () => {
    const otherOrg = await db.organization.create({
      data: { name: `${testId("other-org")}` },
    });
    otherOrgId.current = otherOrg.id;

    const acmeInvoice = await db.invoice.create({
      data: {
        organizationId: ACME_ORG_ID,
        invoiceNumber: testId("acme-inv"),
        amount: 111,
        status: "unpaid",
      },
    });
    acmeInvoiceId.current = acmeInvoice.id;

    const otherOrgInvoice = await db.invoice.create({
      data: {
        organizationId: otherOrgId.current,
        invoiceNumber: testId("other-inv"),
        amount: 222,
        status: "unpaid",
      },
    });
    otherOrgInvoiceId.current = otherOrgInvoice.id;
  });

  afterAll(async () => {
    if (acmeInvoiceId.current) {
      await db.invoice.delete({ where: { id: acmeInvoiceId.current } }).catch(() => {});
    }
    if (otherOrgInvoiceId.current) {
      await db.invoice.delete({ where: { id: otherOrgInvoiceId.current } }).catch(() => {});
    }
    if (otherOrgId.current) {
      await db.organization.delete({ where: { id: otherOrgId.current } }).catch(() => {});
    }
  });

  it("the FIXED pattern (findFirst + organizationId) returns nothing for another org's invoice id", async () => {
    const result = await db.invoice.findFirst({
      where: { id: otherOrgInvoiceId.current, organizationId: ACME_ORG_ID },
    });
    expect(result).toBeNull();
  });

  it("the FIXED pattern still returns the invoice when it actually belongs to the requesting org", async () => {
    const result = await db.invoice.findFirst({
      where: { id: acmeInvoiceId.current, organizationId: ACME_ORG_ID },
    });
    expect(result?.id).toBe(acmeInvoiceId.current);
    expect(result?.amount).toBe(111);
  });

  it("documents the exact vulnerability: the OLD pattern (bare findUnique) would have leaked the other org's invoice", async () => {
    // This is the exact call the vulnerable code used to make — id alone,
    // no organizationId, structurally un-guardable by tenantGuard. It's
    // still allowed to run (findUnique is deliberately exempt), which is
    // precisely why this had to be fixed by changing the query shape
    // itself, not by strengthening the guard.
    const leaked = await db.invoice.findUnique({ where: { id: otherOrgInvoiceId.current } });
    expect(leaked).not.toBeNull();
    expect(leaked?.amount).toBe(222);
  });
});
