import { describe, expect, it } from "vitest";
import { keepTimeOfDay, stillOutAtCustomer } from "@/lib/bookingDates";

describe("keepTimeOfDay (saving the edit form must not wipe delivery times)", () => {
  const nineAm = new Date("2026-12-01T09:00:00.000Z");

  it("keeps the original exactly when the day hasn't changed", () => {
    expect(keepTimeOfDay("2026-12-01", nineAm)).toBe(nineAm);
  });

  it("moves to the new day at the same time of day", () => {
    expect(keepTimeOfDay("2026-12-04", nineAm).toISOString()).toBe("2026-12-04T09:00:00.000Z");
  });

  it("keeps the original when nothing usable was typed", () => {
    for (const typed of [undefined, null, "", "not a date", "2026-13-45"]) {
      expect(keepTimeOfDay(typed, nineAm)).toBe(nineAm);
    }
  });

  it("accepts a datetime-looking value by its date part", () => {
    expect(keepTimeOfDay("2026-12-02T00:00:00.000Z", nineAm).toISOString()).toBe("2026-12-02T09:00:00.000Z");
  });
});

describe("stillOutAtCustomer", () => {
  const t = new Date();
  it("is true when something was delivered and not yet picked up", () => {
    expect(stillOutAtCustomer([{ deliveredAt: t, actualReturnDate: null }])).toBe(true);
    expect(stillOutAtCustomer([{ deliveredAt: t, actualReturnDate: t }, { deliveredAt: t, actualReturnDate: null }])).toBe(true);
  });

  it("is false before delivery, and once everything is back", () => {
    expect(stillOutAtCustomer([{ deliveredAt: null, actualReturnDate: null }])).toBe(false);
    expect(stillOutAtCustomer([{ deliveredAt: t, actualReturnDate: t }])).toBe(false);
    expect(stillOutAtCustomer([])).toBe(false);
  });
});
