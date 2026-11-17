import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { syncInvoiceWithBooking } from "@/lib/invoicing";
import { invoiceNotOnCancelledBooking } from "@/lib/invoiceStatus";
import { verifySpecificItemsAvailable } from "@/lib/availability";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression tests for the audit follow-ups: an unpaid invoice must follow
// its booking's edited price (without clobbering hand-added lines or touching
// paid invoices), cancelled bookings' invoices must drop out of "money owed"
// queries, and editing a booking's dates must re-check availability without
// the booking conflicting with itself.
describe("invoice sync, cancelled-booking filter, availability re-check", () => {
  const prefix = testId("sync");
  const ids = {
    customer: "",
    category: "",
    item: "",
    openBooking: "",
    cancelledBooking: "",
    paidBooking: "",
    openItemRow: "",
  };
  const invoiceIds: string[] = [];

  beforeAll(async () => {
    const customer = await db.customer.create({ data: { organizationId: ACME_ORG_ID, name: `${prefix}-customer` } });
    ids.customer = customer.id;
    const category = await db.equipmentCategory.create({
      data: { organizationId: ACME_ORG_ID, name: `${prefix}-category`, dumpsAtOwnYard: false },
    });
    ids.category = category.id;
    const item = await db.equipmentItem.create({
      data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: `${prefix}-item` },
    });
    ids.item = item.id;

    const start = new Date("2027-08-02T09:00:00Z");
    const end = new Date("2027-08-05T09:00:00Z");
    const mk = async (status: string, label: string, equipmentItemId = item.id) =>
      db.booking.create({
        data: {
          organizationId: ACME_ORG_ID,
          customerId: customer.id,
          deliveryAddress: `${label} Sync Test Ave`,
          status,
          notes: `${prefix}-${label}`,
          items: { create: [{ equipmentItemId, startDate: start, expectedReturnDate: end, price: 100 }] },
        },
        include: { items: true },
      });

    const open = await mk("confirmed", "open");
    ids.openBooking = open.id;
    ids.openItemRow = open.items[0].id;
    const cancelled = await mk("cancelled", "cancelled");
    ids.cancelledBooking = cancelled.id;
    const paid = await mk("confirmed", "paid");
    ids.paidBooking = paid.id;

    const mkInvoice = async (bookingId: string | null, status: string, label: string) => {
      const invoice = await db.invoice.create({
        data: {
          organizationId: ACME_ORG_ID,
          bookingId,
          customerId: bookingId ? undefined : customer.id,
          invoiceNumber: `${prefix}-${label}`,
          amount: 100,
          status,
          lineItems: { create: [{ description: "Base", amount: 100, type: "base" }] },
        },
      });
      invoiceIds.push(invoice.id);
      return invoice;
    };
    await mkInvoice(open.id, "unpaid", "open");
    await mkInvoice(cancelled.id, "unpaid", "cancelled");
    await mkInvoice(paid.id, "paid", "paid");
    await mkInvoice(null, "unpaid", "nobooking");
  });

  afterAll(async () => {
    await db.invoiceLineItem.deleteMany({ where: { invoice: { invoiceNumber: { startsWith: prefix } } } });
    await db.invoice.deleteMany({ where: { organizationId: ACME_ORG_ID, invoiceNumber: { startsWith: prefix } } });
    await db.bookingItem.deleteMany({ where: { equipmentItemId: ids.item } });
    await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, notes: { startsWith: prefix } } });
    await db.equipmentItem.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.item } });
    await db.equipmentCategory.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.category } });
    await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.customer } });
  });

  it("refreshes an unpaid invoice after an item's price changes, keeping a hand-added line", async () => {
    const invoice = await db.invoice.findFirstOrThrow({ where: { organizationId: ACME_ORG_ID, bookingId: ids.openBooking } });
    await db.invoiceLineItem.create({
      data: { invoiceId: invoice.id, description: "Damage — scratch", amount: 25, type: "damage" },
    });
    await db.invoice.update({ where: { id: invoice.id }, data: { amount: 125 } });
    await db.bookingItem.update({ where: { id: ids.openItemRow }, data: { price: 150 } });

    expect(await syncInvoiceWithBooking(ids.openBooking)).toBe(true);

    const after = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(after.amount).toBe(175); // new 150 rental + the 25 damage line
    expect(after.lineItems.filter((l) => l.type === "base").map((l) => l.amount)).toEqual([150]);
    expect(after.lineItems.some((l) => l.type === "damage" && l.amount === 25)).toBe(true);
  });

  it("leaves a paid invoice untouched", async () => {
    await db.bookingItem.updateMany({ where: { bookingId: ids.paidBooking }, data: { price: 999 } });
    expect(await syncInvoiceWithBooking(ids.paidBooking)).toBe(false);
    const invoice = await db.invoice.findFirstOrThrow({ where: { organizationId: ACME_ORG_ID, bookingId: ids.paidBooking } });
    expect(invoice.amount).toBe(100);
  });

  it("drops invoices on cancelled bookings from 'owed' queries but keeps ones with no booking", async () => {
    const rows = await db.invoice.findMany({
      where: {
        AND: [
          { organizationId: ACME_ORG_ID, status: { not: "paid" }, invoiceNumber: { startsWith: prefix } },
          invoiceNotOnCancelledBooking,
        ],
      },
      select: { invoiceNumber: true },
    });
    expect(rows.map((r) => r.invoiceNumber).sort()).toEqual([`${prefix}-nobooking`, `${prefix}-open`]);
  });

  it("re-checks availability for an edited booking without it conflicting with itself", async () => {
    const start = new Date("2027-08-02T09:00:00Z");
    const end = new Date("2027-08-05T09:00:00Z");
    const request = [{ equipmentItemId: ids.item, startDate: start, endDate: end }];

    // The still-active "open" and "paid" bookings both hold this unit on these days.
    await expect(verifySpecificItemsAvailable(ACME_ORG_ID, request)).rejects.toThrow(/overlapping/);

    const allActiveItemRows = (
      await db.bookingItem.findMany({ where: { equipmentItemId: ids.item, booking: { status: { not: "cancelled" } } } })
    ).map((b) => b.id);
    await expect(verifySpecificItemsAvailable(ACME_ORG_ID, request, db, allActiveItemRows)).resolves.toBeUndefined();
  });
});
