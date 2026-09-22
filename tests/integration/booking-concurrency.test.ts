import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// findAvailableItems reads the requesting org via getPublicOrganizationId,
// which needs next/headers' real request context (a Host header) that
// doesn't exist outside an actual Next.js request. Mocking just this one
// export — rather than faking next/headers — pins the test to the real
// Acme org without touching Organization.publicDomain (which is null for
// Acme today) or fighting Next's internals for something unrelated to
// what this test actually verifies.
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return { ...actual, getPublicOrganizationId: async () => ACME_ORG_ID };
});

// Deliberately imported AFTER the mock above, matching vi.mock's hoisting
// contract (vi.mock calls are hoisted above imports by Vitest, so this
// ordering in the source doesn't actually matter — kept this way for
// readability).
const { findAvailableItems } = await import("@/lib/availability");

// Regression test for T019/T021/T022: the double-booking race fixed this
// audit. Reproduces the exact mechanism reserveAndCreateBooking
// (src/app/book/actions.ts) uses — findAvailableItems's availability
// re-check run inside a Postgres Serializable transaction — against a
// throwaway category with exactly ONE unit, firing two concurrent
// "reservation" attempts for the same dates. Before the fix, both would
// have silently succeeded; Postgres's Serializable isolation is what
// makes this test meaningful (not mockable — this is exactly why these
// are real-DB integration tests, not unit tests with a fake Prisma).
describe("booking concurrency (T019 regression)", () => {
  const categoryId = { current: "" };
  const itemId = { current: "" };
  const customerId = { current: "" };
  const startDate = new Date("2027-01-10T09:00:00.000Z");
  const endDate = new Date("2027-01-12T09:00:00.000Z");

  beforeAll(async () => {
    const category = await db.equipmentCategory.create({
      data: { organizationId: ACME_ORG_ID, name: testId("race-category"), dumpsAtOwnYard: true },
    });
    categoryId.current = category.id;

    const item = await db.equipmentItem.create({
      data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: testId("race-item") },
    });
    itemId.current = item.id;

    const customer = await db.customer.create({
      data: { organizationId: ACME_ORG_ID, name: testId("race-customer") },
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

  async function attemptReservation(label: string) {
    return db.$transaction(
      async (tx) => {
        const available = await findAvailableItems(categoryId.current, startDate, endDate, tx);
        if (available.length === 0) throw new Error("nothing available");
        return tx.booking.create({
          data: {
            organizationId: ACME_ORG_ID,
            customerId: customerId.current,
            deliveryAddress: "123 Race Test St",
            notes: testId(`race-booking-${label}`),
            items: {
              create: [
                {
                  equipmentItemId: available[0].id,
                  startDate,
                  expectedReturnDate: endDate,
                },
              ],
            },
          },
          include: { items: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  it("lets exactly one of two truly concurrent requests reserve the single available unit", async () => {
    const results = await Promise.allSettled([
      attemptReservation("a"),
      attemptReservation("b"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // The loser must fail because Postgres detected the conflict, not for
    // some unrelated reason — a P2034 is exactly what the real
    // reserveAndCreateBooking catches to decide whether to retry once.
    const failure = (rejected[0] as PromiseRejectedResult).reason;
    const isSerializationConflict =
      failure instanceof Prisma.PrismaClientKnownRequestError && failure.code === "P2034";
    expect(isSerializationConflict).toBe(true);

    const remaining = await db.bookingItem.count({ where: { equipmentItemId: itemId.current } });
    expect(remaining).toBe(1);
  });
});
