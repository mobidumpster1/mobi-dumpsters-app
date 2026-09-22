import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { verifySpecificItemsAvailable } from "@/lib/availability";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression test for T176: the internal staff-facing createBooking
// action (src/app/(internal)/bookings/actions.ts) used to have the exact
// same double-booking race fixed on the public checkout path for T019 —
// staff pick a specific equipmentItemId directly rather than searching a
// category, so it needed its own re-check (verifySpecificItemsAvailable)
// rather than reusing findAvailableItems, wrapped in the same Postgres
// Serializable transaction. Unlike booking-concurrency.test.ts, this
// function takes organizationId as a plain parameter rather than
// resolving it from next/headers, so no session mock is needed here.
describe("staff booking concurrency (T176 regression)", () => {
  const categoryId = { current: "" };
  const itemId = { current: "" };
  const customerId = { current: "" };
  const startDate = new Date("2027-03-10T09:00:00.000Z");
  const endDate = new Date("2027-03-12T09:00:00.000Z");

  beforeAll(async () => {
    const category = await db.equipmentCategory.create({
      data: { organizationId: ACME_ORG_ID, name: testId("staff-race-category"), dumpsAtOwnYard: true },
    });
    categoryId.current = category.id;

    const item = await db.equipmentItem.create({
      data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: testId("staff-race-item") },
    });
    itemId.current = item.id;

    const customer = await db.customer.create({
      data: { organizationId: ACME_ORG_ID, name: testId("staff-race-customer") },
    });
    customerId.current = customer.id;
  });

  afterAll(async () => {
    await db.bookingItem.deleteMany({ where: { equipmentItemId: itemId.current } });
    await db.booking.deleteMany({
      where: { organizationId: ACME_ORG_ID, customerId: customerId.current },
    });
    await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: customerId.current } });
    await db.equipmentItem.deleteMany({ where: { organizationId: ACME_ORG_ID, id: itemId.current } });
    await db.equipmentCategory.deleteMany({
      where: { organizationId: ACME_ORG_ID, id: categoryId.current },
    });
  });

  async function attemptStaffReservation(label: string) {
    return db.$transaction(
      async (tx) => {
        await verifySpecificItemsAvailable(
          ACME_ORG_ID,
          [{ equipmentItemId: itemId.current, startDate, endDate }],
          tx
        );
        return tx.booking.create({
          data: {
            organizationId: ACME_ORG_ID,
            customerId: customerId.current,
            deliveryAddress: "123 Staff Race Test St",
            notes: testId(`staff-race-booking-${label}`),
            items: {
              create: [{ equipmentItemId: itemId.current, startDate, expectedReturnDate: endDate }],
            },
          },
          include: { items: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  it("lets exactly one of two concurrent staff bookings reserve the same specific unit", async () => {
    const results = await Promise.allSettled([
      attemptStaffReservation("a"),
      attemptStaffReservation("b"),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(rejected).toHaveLength(1);
    const isSerializationConflict =
      rejected[0].reason instanceof Prisma.PrismaClientKnownRequestError &&
      rejected[0].reason.code === "P2034";
    expect(isSerializationConflict).toBe(true);

    const remaining = await db.bookingItem.count({ where: { equipmentItemId: itemId.current } });
    expect(remaining).toBe(1);
  });

  it("verifySpecificItemsAvailable rejects a unit with an overlapping non-cancelled booking", async () => {
    const existing = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customerId.current,
        deliveryAddress: "123 Staff Race Test St",
        notes: testId("staff-race-existing"),
        items: {
          create: [{ equipmentItemId: itemId.current, startDate, expectedReturnDate: endDate }],
        },
      },
    });

    await expect(
      verifySpecificItemsAvailable(ACME_ORG_ID, [
        { equipmentItemId: itemId.current, startDate, endDate },
      ])
    ).rejects.toThrow(/just booked for overlapping dates/);

    await db.bookingItem.deleteMany({ where: { equipmentItemId: itemId.current } });
    await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, id: existing.id } });
  });

  it("verifySpecificItemsAvailable allows the unit once the conflicting booking is cancelled", async () => {
    const existing = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customerId.current,
        deliveryAddress: "123 Staff Race Test St",
        notes: testId("staff-race-cancelled"),
        status: "cancelled",
        items: {
          create: [{ equipmentItemId: itemId.current, startDate, expectedReturnDate: endDate }],
        },
      },
    });

    await expect(
      verifySpecificItemsAvailable(ACME_ORG_ID, [
        { equipmentItemId: itemId.current, startDate, endDate },
      ])
    ).resolves.not.toThrow();

    await db.bookingItem.deleteMany({ where: { equipmentItemId: itemId.current } });
    await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, id: existing.id } });
  });
});
