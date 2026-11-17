import { describe, expect, it } from "vitest";
import { computeInvoiceLineItems } from "@/lib/invoicing";

function item(overrides: { start: string; expectedReturn: string; actualReturn?: string | null }) {
  return {
    id: "item-1",
    startDate: new Date(overrides.start),
    expectedReturnDate: new Date(overrides.expectedReturn),
    actualReturnDate: overrides.actualReturn ? new Date(overrides.actualReturn) : null,
    actualTonnage: null,
    actualMileage: null,
    price: 300,
    equipmentItem: {
      label: "Dumpster 1",
      category: {
        basePrice: 300,
        includedDays: 7,
        overageDayRate: 25,
        includedTonnage: null,
        overageTonnageRate: null,
        includedMileage: null,
        overageMileageRate: null,
      },
    },
  };
}

const extraDayLines = (lines: ReturnType<typeof computeInvoiceLineItems>) =>
  lines.filter((l) => l.type === "overage_days");

describe("extra-day billing", () => {
  it("does not bill an extra day for a later time of day on the last day", () => {
    const lines = computeInvoiceLineItems([
      item({ start: "2027-03-01T08:00:00Z", expectedReturn: "2027-03-08T15:00:00Z" }),
    ]);
    expect(extraDayLines(lines)).toHaveLength(0);
  });

  it("does not bill for a pickup that happened late on our side", () => {
    const lines = computeInvoiceLineItems([
      item({
        start: "2027-03-01T08:00:00Z",
        expectedReturn: "2027-03-08T08:00:00Z",
        actualReturn: "2027-03-11T10:00:00Z", // truck showed up 3 days late
      }),
    ]);
    expect(extraDayLines(lines)).toHaveLength(0);
  });

  it("bills the days past the included ones once the return date is extended", () => {
    const lines = computeInvoiceLineItems([
      item({ start: "2027-03-01T08:00:00Z", expectedReturn: "2027-03-11T08:00:00Z" }),
    ]);
    const extra = extraDayLines(lines);
    expect(extra).toHaveLength(1);
    expect(extra[0].amount).toBe(75); // 10 days - 7 included = 3 x $25
  });
});
