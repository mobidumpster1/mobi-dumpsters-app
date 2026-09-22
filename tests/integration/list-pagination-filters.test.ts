import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { invoiceStatusFilter } from "@/lib/invoiceStatus";
import { bookingStatusFilter } from "@/lib/bookingStatus";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression test for T180: the Invoices and Bookings list pages used to
// fetch every row for the org and filter/paginate in memory. The fix moves
// filtering to the database via invoiceStatusFilter/bookingStatusFilter, a
// hand-written SQL-side equivalent of the existing computeDisplayStatus/
// computeBookingStatus (+ pending/cancelled) logic those pages already used
// to label a row's status. This exercises the two translations directly
// against real rows, since a subtly wrong Prisma where clause would
// silently drop or duplicate rows across pages.
describe("list pagination status filters (T180 regression)", () => {
  describe("invoiceStatusFilter", () => {
    const prefix = testId("inv-filter");
    const ids = { unpaidFuture: "", unpaidNoDueDate: "", overdue: "", partial: "", paid: "" };

    beforeAll(async () => {
      const past = new Date(Date.now() - 10 * 86_400_000);
      const future = new Date(Date.now() + 10 * 86_400_000);

      const [unpaidFuture, unpaidNoDueDate, overdue, partial, paid] = await Promise.all([
        db.invoice.create({
          data: { organizationId: ACME_ORG_ID, invoiceNumber: `${prefix}-unpaid-future`, amount: 100, status: "unpaid", dueDate: future },
        }),
        db.invoice.create({
          data: { organizationId: ACME_ORG_ID, invoiceNumber: `${prefix}-unpaid-nodue`, amount: 100, status: "unpaid", dueDate: null },
        }),
        db.invoice.create({
          data: { organizationId: ACME_ORG_ID, invoiceNumber: `${prefix}-overdue`, amount: 100, status: "unpaid", dueDate: past },
        }),
        db.invoice.create({
          data: { organizationId: ACME_ORG_ID, invoiceNumber: `${prefix}-partial`, amount: 100, status: "partial", dueDate: past },
        }),
        db.invoice.create({
          data: { organizationId: ACME_ORG_ID, invoiceNumber: `${prefix}-paid`, amount: 100, status: "paid", dueDate: past },
        }),
      ]);
      ids.unpaidFuture = unpaidFuture.id;
      ids.unpaidNoDueDate = unpaidNoDueDate.id;
      ids.overdue = overdue.id;
      ids.partial = partial.id;
      ids.paid = paid.id;
    });

    afterAll(async () => {
      await db.invoice.deleteMany({ where: { organizationId: ACME_ORG_ID, invoiceNumber: { startsWith: prefix } } });
    });

    async function idsMatching(status: string): Promise<Set<string>> {
      const rows = await db.invoice.findMany({
        where: { AND: [{ organizationId: ACME_ORG_ID, invoiceNumber: { startsWith: prefix } }, invoiceStatusFilter(status)] },
        select: { id: true },
      });
      return new Set(rows.map((r) => r.id));
    }

    it("'unpaid' matches only not-yet-due unpaid invoices, including one with no dueDate at all", async () => {
      const matches = await idsMatching("unpaid");
      expect(matches).toEqual(new Set([ids.unpaidFuture, ids.unpaidNoDueDate]));
    });

    it("'overdue' matches only unpaid invoices whose dueDate has passed", async () => {
      const matches = await idsMatching("overdue");
      expect(matches).toEqual(new Set([ids.overdue]));
    });

    it("'partial' and 'paid' match their own status only", async () => {
      expect(await idsMatching("partial")).toEqual(new Set([ids.partial]));
      expect(await idsMatching("paid")).toEqual(new Set([ids.paid]));
    });
  });

  describe("bookingStatusFilter", () => {
    const prefix = testId("bkg-filter");
    const customerId = { current: "" };
    const categoryId = { current: "" };
    const itemIds = { current: [] as string[] };
    const ids = { pending: "", cancelled: "", scheduled: "", inProgress: "", completed: "" };

    beforeAll(async () => {
      const customer = await db.customer.create({
        data: { organizationId: ACME_ORG_ID, name: testId("bkg-filter-customer") },
      });
      customerId.current = customer.id;

      const category = await db.equipmentCategory.create({
        data: { organizationId: ACME_ORG_ID, name: testId("bkg-filter-category"), dumpsAtOwnYard: true },
      });
      categoryId.current = category.id;

      const items = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          db.equipmentItem.create({
            data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: testId(`bkg-filter-item-${i}`) },
          })
        )
      );
      itemIds.current = items.map((i) => i.id);

      const now = new Date();
      const [pending, cancelled, scheduled, inProgress, completed] = await Promise.all([
        db.booking.create({
          data: {
            organizationId: ACME_ORG_ID, customerId: customer.id, deliveryAddress: "1 Filter Test Ave",
            status: "pending", notes: `${prefix}-pending`,
            items: { create: [{ equipmentItemId: items[0].id, startDate: now, expectedReturnDate: now }] },
          },
        }),
        db.booking.create({
          data: {
            organizationId: ACME_ORG_ID, customerId: customer.id, deliveryAddress: "2 Filter Test Ave",
            status: "cancelled", notes: `${prefix}-cancelled`,
            items: { create: [{ equipmentItemId: items[1].id, startDate: now, expectedReturnDate: now }] },
          },
        }),
        db.booking.create({
          data: {
            organizationId: ACME_ORG_ID, customerId: customer.id, deliveryAddress: "3 Filter Test Ave",
            status: "confirmed", notes: `${prefix}-scheduled`,
            items: { create: [{ equipmentItemId: items[2].id, startDate: now, expectedReturnDate: now }] },
          },
        }),
        db.booking.create({
          data: {
            organizationId: ACME_ORG_ID, customerId: customer.id, deliveryAddress: "4 Filter Test Ave",
            status: "confirmed", notes: `${prefix}-in-progress`,
            items: { create: [{ equipmentItemId: items[3].id, startDate: now, expectedReturnDate: now, deliveredAt: now }] },
          },
        }),
        db.booking.create({
          data: {
            organizationId: ACME_ORG_ID, customerId: customer.id, deliveryAddress: "5 Filter Test Ave",
            status: "confirmed", notes: `${prefix}-completed`,
            items: { create: [{ equipmentItemId: items[4].id, startDate: now, expectedReturnDate: now, deliveredAt: now, actualReturnDate: now }] },
          },
        }),
      ]);
      ids.pending = pending.id;
      ids.cancelled = cancelled.id;
      ids.scheduled = scheduled.id;
      ids.inProgress = inProgress.id;
      ids.completed = completed.id;
    });

    afterAll(async () => {
      await db.bookingItem.deleteMany({ where: { equipmentItemId: { in: itemIds.current } } });
      await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, notes: { startsWith: prefix } } });
      await db.equipmentItem.deleteMany({ where: { organizationId: ACME_ORG_ID, id: { in: itemIds.current } } });
      await db.equipmentCategory.deleteMany({ where: { organizationId: ACME_ORG_ID, id: categoryId.current } });
      await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: customerId.current } });
    });

    async function idsMatching(status: string): Promise<Set<string>> {
      const rows = await db.booking.findMany({
        where: { AND: [{ organizationId: ACME_ORG_ID, notes: { startsWith: prefix } }, bookingStatusFilter(status)] },
        select: { id: true },
      });
      return new Set(rows.map((r) => r.id));
    }

    it("each status filter matches exactly the one booking in that state", async () => {
      expect(await idsMatching("pending")).toEqual(new Set([ids.pending]));
      expect(await idsMatching("cancelled")).toEqual(new Set([ids.cancelled]));
      expect(await idsMatching("scheduled")).toEqual(new Set([ids.scheduled]));
      expect(await idsMatching("in_progress")).toEqual(new Set([ids.inProgress]));
      expect(await idsMatching("completed")).toEqual(new Set([ids.completed]));
    });
  });
});
