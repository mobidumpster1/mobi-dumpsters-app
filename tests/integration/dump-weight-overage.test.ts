import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applyDumpWeightToBooking } from "@/app/(internal)/customers/dumpActions";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression test for the "notify customer if over weight" feature: a
// scale receipt only exists once the load's already been dumped, well
// after "Mark Returned" (the only place actualTonnage could otherwise be
// entered) -- so without this, actualTonnage stays null forever and
// invoicing.ts's overage-tonnage charge never fires. applyDumpWeightToBooking
// (called from addDumpLogEntry once a Dump Log entry is saved against a
// booking) closes that gap by writing the weight onto the one booking item
// that's been returned but not yet weighed, then checking it against the
// category's included tonnage.
describe("applyDumpWeightToBooking (overweight dump-log regression)", () => {
  const customerId = { current: "" };
  const categoryId = { current: "" };
  const itemIds = { current: [] as string[] };

  beforeAll(async () => {
    const customer = await db.customer.create({
      data: { organizationId: ACME_ORG_ID, name: testId("dump-weight-customer"), phone: "4785550000" },
    });
    customerId.current = customer.id;

    const category = await db.equipmentCategory.create({
      data: {
        organizationId: ACME_ORG_ID,
        name: testId("dump-weight-category"),
        dumpsAtOwnYard: true,
        includedTonnage: 2,
        overageTonnageRate: 50,
      },
    });
    categoryId.current = category.id;

    const items = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        db.equipmentItem.create({
          data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: testId(`dump-weight-item-${i}`) },
        })
      )
    );
    itemIds.current = items.map((i) => i.id);
  });

  afterAll(async () => {
    await db.invoiceLineItem.deleteMany({ where: { invoice: { invoiceNumber: { startsWith: "vitest-dumpbill" } } } });
    await db.invoice.deleteMany({ where: { organizationId: ACME_ORG_ID, invoiceNumber: { startsWith: "vitest-dumpbill" } } });
    await db.customerNote.deleteMany({ where: { customerId: customerId.current } });
    await db.bookingItem.deleteMany({ where: { equipmentItemId: { in: itemIds.current } } });
    await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, customerId: customerId.current } });
    await db.equipmentItem.deleteMany({ where: { organizationId: ACME_ORG_ID, id: { in: itemIds.current } } });
    await db.equipmentCategory.deleteMany({ where: { organizationId: ACME_ORG_ID, id: categoryId.current } });
    await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: customerId.current } });
  });

  it("applies the weight to the one returned-but-unweighed item and doesn't throw even with no Twilio connection", async () => {
    const now = new Date();
    const booking = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customerId.current,
        deliveryAddress: "1 Overweight Test Ave",
        status: "confirmed",
        items: {
          create: [
            {
              equipmentItemId: itemIds.current[0],
              startDate: now,
              expectedReturnDate: now,
              deliveredAt: now,
              actualReturnDate: now,
              actualTonnage: null,
            },
          ],
        },
      },
      include: { items: true },
    });

    await expect(
      applyDumpWeightToBooking(
        ACME_ORG_ID,
        { id: customerId.current, name: "Overweight Test Customer", phone: "4785550000" },
        booking.id,
        3 // over the category's 2-ton included limit
      )
    ).resolves.toBeUndefined();

    const updatedItem = await db.bookingItem.findUniqueOrThrow({ where: { id: booking.items[0].id } });
    expect(updatedItem.actualTonnage).toBe(3);
  });

  it("does not apply the weight when zero items are returned-but-unweighed", async () => {
    const now = new Date();
    const booking = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customerId.current,
        deliveryAddress: "2 Overweight Test Ave",
        status: "confirmed",
        items: {
          create: [
            {
              equipmentItemId: itemIds.current[1],
              startDate: now,
              expectedReturnDate: now,
              deliveredAt: now,
              actualReturnDate: null, // not yet returned
              actualTonnage: null,
            },
          ],
        },
      },
      include: { items: true },
    });

    await applyDumpWeightToBooking(
      ACME_ORG_ID,
      { id: customerId.current, name: "Overweight Test Customer", phone: "4785550000" },
      booking.id,
      3
    );

    const unchangedItem = await db.bookingItem.findUniqueOrThrow({ where: { id: booking.items[0].id } });
    expect(unchangedItem.actualTonnage).toBeNull();
  });

  it("does not apply the weight when more than one item is returned-but-unweighed (ambiguous)", async () => {
    const now = new Date();
    const booking = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customerId.current,
        deliveryAddress: "3 Overweight Test Ave",
        status: "confirmed",
        items: {
          create: [
            {
              equipmentItemId: itemIds.current[2],
              startDate: now,
              expectedReturnDate: now,
              deliveredAt: now,
              actualReturnDate: now,
              actualTonnage: null,
            },
            {
              equipmentItemId: itemIds.current[0],
              startDate: now,
              expectedReturnDate: now,
              deliveredAt: now,
              actualReturnDate: now,
              actualTonnage: null,
            },
          ],
        },
      },
      include: { items: true },
    });

    await applyDumpWeightToBooking(
      ACME_ORG_ID,
      { id: customerId.current, name: "Overweight Test Customer", phone: "4785550000" },
      booking.id,
      3
    );

    const items = await db.bookingItem.findMany({ where: { id: { in: booking.items.map((i) => i.id) } } });
    expect(items.every((i) => i.actualTonnage === null)).toBe(true);
  });

  async function bookingWithInvoice(status: string, suffix: string) {
    const now = new Date();
    const booking = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customerId.current,
        deliveryAddress: `${suffix} Overweight Billing Test Ave`,
        status: "confirmed",
        items: {
          create: [
            {
              equipmentItemId: itemIds.current[1],
              startDate: now,
              expectedReturnDate: now,
              deliveredAt: now,
              actualReturnDate: now,
              actualTonnage: null,
            },
          ],
        },
      },
    });
    const invoice = await db.invoice.create({
      data: {
        organizationId: ACME_ORG_ID,
        bookingId: booking.id,
        invoiceNumber: `vitest-dumpbill-${suffix}-${Date.now()}`,
        amount: 100,
        status,
        lineItems: { create: [{ description: "Base Rental", amount: 100, type: "base" }] },
      },
    });
    return { booking, invoice };
  }

  it("adds the overage line to an existing unpaid invoice (3 tons vs 2 included at $50/ton = +$50)", async () => {
    const { booking, invoice } = await bookingWithInvoice("unpaid", "a");

    await applyDumpWeightToBooking(
      ACME_ORG_ID,
      { id: customerId.current, name: "Overweight Test Customer", phone: "4785550000" },
      booking.id,
      3
    );

    const updated = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(updated.amount).toBe(150);
    const overageLines = updated.lineItems.filter((l) => l.type === "overage_tonnage");
    expect(overageLines).toHaveLength(1);
    expect(overageLines[0].amount).toBe(50);
  });

  it("leaves a paid invoice alone and records a note for staff instead", async () => {
    const { booking, invoice } = await bookingWithInvoice("paid", "b");

    await applyDumpWeightToBooking(
      ACME_ORG_ID,
      { id: customerId.current, name: "Overweight Test Customer", phone: "4785550000" },
      booking.id,
      3
    );

    const updated = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(updated.amount).toBe(100);
    expect(updated.lineItems.filter((l) => l.type === "overage_tonnage")).toHaveLength(0);

    const notes = await db.customerNote.findMany({ where: { customerId: customerId.current } });
    expect(notes.some((n) => n.content.includes("NOT added automatically"))).toBe(true);
  });
});
