import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { extendBookingDates } from "@/lib/bookingExtension";
import { ACME_ORG_ID, cleanupTestFixtures, testId } from "../helpers/testOrg";

// Extending a booking moves its return date out, refuses to run into another
// booking's days on the same unit, and refuses cancelled bookings and loads
// that have already come back.
describe("extending a booking", () => {
  const prefix = testId("extend");
  const ids = { customer: "", category: "", item: "", booking: "", blocker: "", cancelled: "", returned: "" };

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
    const item2 = await db.equipmentItem.create({
      data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: `${prefix}-item2` },
    });

    const mk = (status: string, label: string, equipmentItemId: string, start: string, end: string, returned = false) =>
      db.booking.create({
        data: {
          organizationId: ACME_ORG_ID,
          customerId: customer.id,
          deliveryAddress: `${label} Extension Test Ave`,
          status,
          notes: `${prefix}-${label}`,
          items: {
            create: [
              {
                equipmentItemId,
                startDate: new Date(start),
                expectedReturnDate: new Date(end),
                price: 100,
                ...(returned ? { actualReturnDate: new Date(end) } : {}),
              },
            ],
          },
        },
      });

    ids.booking = (await mk("confirmed", "main", item.id, "2027-10-04T09:00:00Z", "2027-10-06T09:00:00Z")).id;
    // Holds the same unit starting 5 days after the main booking ends.
    ids.blocker = (await mk("confirmed", "blocker", item.id, "2027-10-09T09:00:00Z", "2027-10-12T09:00:00Z")).id;
    ids.cancelled = (await mk("cancelled", "cancelled", item2.id, "2027-11-01T09:00:00Z", "2027-11-02T09:00:00Z")).id;
    ids.returned = (await mk("confirmed", "returned", item2.id, "2027-12-01T09:00:00Z", "2027-12-02T09:00:00Z", true)).id;
  });

  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("moves the return date out by the requested whole days", async () => {
    await extendBookingDates(ACME_ORG_ID, ids.booking, 2);
    const item = await db.bookingItem.findFirstOrThrow({ where: { bookingId: ids.booking } });
    expect(item.expectedReturnDate.toISOString()).toBe("2027-10-08T09:00:00.000Z");
  });

  it("refuses when the extra days would overlap another booking of the same unit", async () => {
    // 2027-10-08 + 2 days = 10-10, which runs into the blocker (10-09..10-12).
    await expect(extendBookingDates(ACME_ORG_ID, ids.booking, 2)).rejects.toThrow();
    const item = await db.bookingItem.findFirstOrThrow({ where: { bookingId: ids.booking } });
    expect(item.expectedReturnDate.toISOString()).toBe("2027-10-08T09:00:00.000Z");
  });

  it("rejects bad day counts, cancelled bookings and loads already returned", async () => {
    await expect(extendBookingDates(ACME_ORG_ID, ids.booking, 0)).rejects.toThrow();
    await expect(extendBookingDates(ACME_ORG_ID, ids.booking, 1.5)).rejects.toThrow();
    await expect(extendBookingDates(ACME_ORG_ID, ids.cancelled, 1)).rejects.toThrow(/cancelled/);
    await expect(extendBookingDates(ACME_ORG_ID, ids.returned, 1)).rejects.toThrow(/returned/);
  });
});
