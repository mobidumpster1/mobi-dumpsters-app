import { describe, expect, it } from "vitest";
import { computeUtilization } from "@/lib/utilization";

// Regression test for T092: computeUtilization used to treat the whole
// [startDate, actualReturnDate ?? expectedReturnDate) span as one
// undifferentiated "on rent" bucket, with no distinction between reserved
// (booked but not yet delivered) and actually-on-property time, and no
// awareness of MaintenanceWindow at all. The fix splits each booking item's
// span at deliveredAt and adds a separate maintenance overlap pass.
describe("computeUtilization (T092 regression)", () => {
  const periodStart = new Date("2027-06-01T00:00:00Z");
  const periodEnd = new Date("2027-06-11T00:00:00Z"); // 10-day period

  it("counts pre-delivery time as reserved, not on rent", () => {
    const rows = computeUtilization(
      [
        {
          equipmentItemId: "item-1",
          startDate: new Date("2027-06-02T00:00:00Z"),
          deliveredAt: new Date("2027-06-04T00:00:00Z"),
          expectedReturnDate: new Date("2027-06-07T00:00:00Z"),
          actualReturnDate: null,
        },
      ],
      [],
      periodStart,
      periodEnd
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].daysReserved).toBeCloseTo(2); // 06-02 -> 06-04
    expect(rows[0].daysOnRent).toBeCloseTo(3); // 06-04 -> 06-07
    expect(rows[0].daysOnMaintenance).toBe(0);
    expect(rows[0].utilizationPercent).toBeCloseTo(50); // 5 of 10 days
  });

  it("counts the whole span as reserved when the item was never delivered", () => {
    const rows = computeUtilization(
      [
        {
          equipmentItemId: "item-2",
          startDate: new Date("2027-06-02T00:00:00Z"),
          deliveredAt: null,
          expectedReturnDate: new Date("2027-06-05T00:00:00Z"),
          actualReturnDate: null,
        },
      ],
      [],
      periodStart,
      periodEnd
    );

    expect(rows[0].daysReserved).toBeCloseTo(3);
    expect(rows[0].daysOnRent).toBe(0);
  });

  it("adds maintenance downtime on top of booking-derived time, even for an item with no bookings", () => {
    const rows = computeUtilization(
      [],
      [
        {
          equipmentItemId: "item-3",
          startDate: new Date("2027-06-05T00:00:00Z"),
          endDate: new Date("2027-06-06T00:00:00Z"),
        },
      ],
      periodStart,
      periodEnd
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].daysReserved).toBe(0);
    expect(rows[0].daysOnRent).toBe(0);
    expect(rows[0].daysOnMaintenance).toBeCloseTo(1);
    expect(rows[0].utilizationPercent).toBeCloseTo(10);
  });

  it("prefers actualReturnDate over expectedReturnDate once the item is closed out", () => {
    const rows = computeUtilization(
      [
        {
          equipmentItemId: "item-4",
          startDate: new Date("2027-06-01T00:00:00Z"),
          deliveredAt: new Date("2027-06-01T00:00:00Z"),
          expectedReturnDate: new Date("2027-06-09T00:00:00Z"),
          actualReturnDate: new Date("2027-06-03T00:00:00Z"), // returned early
        },
      ],
      [],
      periodStart,
      periodEnd
    );

    expect(rows[0].daysOnRent).toBeCloseTo(2); // 06-01 -> 06-03, not -> 06-09
  });

  it("clips all three states to the report period and caps utilization at 100%", () => {
    const rows = computeUtilization(
      [
        {
          equipmentItemId: "item-5",
          startDate: new Date("2027-05-28T00:00:00Z"), // starts before the period
          deliveredAt: new Date("2027-06-03T00:00:00Z"),
          expectedReturnDate: new Date("2027-06-20T00:00:00Z"), // ends after the period
          actualReturnDate: null,
        },
      ],
      [
        {
          equipmentItemId: "item-5",
          startDate: new Date("2027-05-25T00:00:00Z"), // starts before the period
          endDate: new Date("2027-06-03T00:00:00Z"),
        },
      ],
      periodStart,
      periodEnd
    );

    expect(rows[0].daysReserved).toBeCloseTo(2); // clipped to 06-01 -> 06-03
    expect(rows[0].daysOnRent).toBeCloseTo(8); // clipped to 06-03 -> 06-11
    expect(rows[0].daysOnMaintenance).toBeCloseTo(2); // clipped to 06-01 -> 06-03
    expect(rows[0].utilizationPercent).toBe(100); // 12 raw days over a 10-day period, capped
  });
});
