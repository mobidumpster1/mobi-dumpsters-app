import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression test for T084/T085: logRecurringBillAsExpense
// (src/app/(internal)/expenses/recurringActions.ts) used to create a
// freestanding Expense with no link back to the RecurringBill it came
// from, and no check for an existing log covering the same period —
// nothing stopped clicking "Log as Expense" twice for the same month.
// Exercises the exact dedup query the fixed action now runs (a full
// server-action call needs a real session/cookies context this suite
// doesn't set up, same reason other "use server" actions are tested at
// the query level elsewhere in this suite).
describe("recurring bill expense dedup (T084/T085 regression)", () => {
  const billId = { current: "" };

  beforeAll(async () => {
    const bill = await db.recurringBill.create({
      data: {
        organizationId: ACME_ORG_ID,
        name: testId("dedup-bill"),
        category: "Software",
        amount: 25,
        frequency: "monthly",
        dueDay: 1,
      },
    });
    billId.current = bill.id;
  });

  afterAll(async () => {
    await db.expense.deleteMany({
      where: { organizationId: ACME_ORG_ID, recurringBillId: billId.current },
    });
    await db.recurringBill.deleteMany({ where: { organizationId: ACME_ORG_ID, id: billId.current } });
  });

  function findAlreadyLoggedThisPeriod(today: Date) {
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return db.expense.findFirst({
      where: { organizationId: ACME_ORG_ID, recurringBillId: billId.current, date: { gte: periodStart } },
    });
  }

  it("finds no existing log before the bill has ever been logged", async () => {
    const found = await findAlreadyLoggedThisPeriod(new Date());
    expect(found).toBeNull();
  });

  it("links a logged expense back to its RecurringBill and the dedup check then finds it", async () => {
    const expense = await db.expense.create({
      data: {
        organizationId: ACME_ORG_ID,
        recurringBillId: billId.current,
        vendor: testId("dedup-vendor"),
        category: "Software",
        amount: 25,
        date: new Date(),
        status: "unpaid",
      },
    });
    expect(expense.recurringBillId).toBe(billId.current);

    const found = await findAlreadyLoggedThisPeriod(new Date());
    expect(found?.id).toBe(expense.id);
  });

  it("does not flag a log from a previous period as covering the current one", async () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 2);
    await db.expense.updateMany({
      where: { organizationId: ACME_ORG_ID, recurringBillId: billId.current },
      data: { date: lastMonth },
    });

    const found = await findAlreadyLoggedThisPeriod(new Date());
    expect(found).toBeNull();
  });
});
