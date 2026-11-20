import { describe, expect, it } from "vitest";
import { invoiceBalanceDue, invoiceDueAnchor } from "@/lib/invoiceStatus";

const day = (s: string) => new Date(`${s}T00:00:00Z`);

// What a customer still owes (and since when) on a plain invoice and on one
// with a payment plan: used by Reports, AR aging and reminder emails.
describe("invoiceBalanceDue", () => {
  it("is the whole amount for an unpaid invoice with no plan", () => {
    expect(invoiceBalanceDue({ status: "unpaid", amount: 450, dueDate: null, issueDate: day("2026-11-01") })).toBe(450);
  });

  it("is zero once paid", () => {
    expect(invoiceBalanceDue({ status: "paid", amount: 450, dueDate: null, issueDate: day("2026-11-01") })).toBe(0);
  });

  it("is the unpaid installments on a plan: $1,000 with the $300 deposit in owes $700", () => {
    const invoice = {
      status: "partial",
      amount: 1000,
      dueDate: null,
      issueDate: day("2026-11-01"),
      installments: [
        { amount: 300, status: "paid", dueDate: day("2026-11-01") },
        { amount: 700, status: "pending", dueDate: day("2026-11-15") },
      ],
    };
    expect(invoiceBalanceDue(invoice)).toBe(700);
  });

  it("ignores refunded installments", () => {
    expect(
      invoiceBalanceDue({
        status: "partial",
        amount: 500,
        dueDate: null,
        issueDate: day("2026-11-01"),
        installments: [
          { amount: 200, status: "refunded", dueDate: null },
          { amount: 300, status: "pending", dueDate: null },
        ],
      })
    ).toBe(300);
  });
});

describe("invoiceDueAnchor", () => {
  it("falls back from the due date to the issue date", () => {
    expect(invoiceDueAnchor({ status: "unpaid", amount: 1, dueDate: day("2026-12-01"), issueDate: day("2026-11-01") })).toEqual(day("2026-12-01"));
    expect(invoiceDueAnchor({ status: "unpaid", amount: 1, dueDate: null, issueDate: day("2026-11-01") })).toEqual(day("2026-11-01"));
  });

  it("counts lateness from the earliest unpaid installment, so a paid deposit doesn't make a missed balance look current", () => {
    const anchor = invoiceDueAnchor({
      status: "partial",
      amount: 1000,
      dueDate: day("2026-12-30"),
      issueDate: day("2026-11-01"),
      installments: [
        { amount: 300, status: "paid", dueDate: day("2026-11-01") },
        { amount: 400, status: "pending", dueDate: day("2026-11-20") },
        { amount: 300, status: "pending", dueDate: day("2026-12-10") },
      ],
    });
    expect(anchor).toEqual(day("2026-11-20"));
  });
});
