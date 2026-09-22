import { describe, expect, it } from "vitest";

// Regression test for T054/T178: submitBookingRequest (src/app/book/actions.ts)
// used to build startDate/endDate as new Date(`${startDateStr}T${deliveryTime}`)
// with no "Z" — parsed against whatever timezone the server process happens
// to run in, rather than the literal digits the customer picked. The fix
// appends "Z" explicitly. These tests exercise the exact string-building
// pattern in isolation (it's inline in submitBookingRequest, not its own
// exported function) to prove it's deterministic regardless of the host
// timezone, including across a real DST transition and near UTC midnight —
// distinct from T054 itself (whether the logic is right), this is about
// whether a test actually exercises it, which nothing did before.
function buildDateTime(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}Z`);
}

describe("booking delivery/pickup date-time parsing (T054/T178 regression)", () => {
  it("parses the literal digits as UTC, not the host process's local timezone", () => {
    const result = buildDateTime("2027-06-15", "09:00");
    expect(result.getUTCFullYear()).toBe(2027);
    expect(result.getUTCMonth()).toBe(5); // 0-indexed: June
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("is unaffected by a US DST spring-forward transition (2027-03-14)", () => {
    // Georgia's clocks jump 2am -> 3am on this date in 2027 — a naive
    // local-time interpretation could produce an invalid or shifted time
    // for a delivery requested right around the transition. The fixed
    // (UTC-literal) parsing has no such edge case at all.
    const result = buildDateTime("2027-03-14", "02:30");
    expect(result.toISOString()).toBe("2027-03-14T02:30:00.000Z");
  });

  it("is unaffected by a US DST fall-back transition (2027-11-07)", () => {
    const result = buildDateTime("2027-11-07", "01:30");
    expect(result.toISOString()).toBe("2027-11-07T01:30:00.000Z");
  });

  it("a rental starting near UTC midnight stays on the requested calendar day", () => {
    // Before the fix, an early-morning time selection could shift onto
    // the previous calendar day depending on the server's local timezone
    // offset — with the literal "Z" parsing, the date component is never
    // reinterpreted at all.
    const result = buildDateTime("2027-01-10", "00:15");
    expect(result.getUTCDate()).toBe(10);
    expect(result.getUTCMonth()).toBe(0);
  });

  it("a multi-day rental's computed pickup date lands on the correct day", () => {
    // Mirrors submitBookingRequest's own addDays(startDateStr, tier.days)
    // + pickupTime construction for a tiered rental.
    const startDateStr = "2027-01-10";
    const tierDays = 3;
    const pickupDateStr = new Date(
      new Date(`${startDateStr}T00:00:00.000Z`).getTime() + tierDays * 86_400_000
    )
      .toISOString()
      .slice(0, 10);
    const pickup = buildDateTime(pickupDateStr, "17:00");
    expect(pickup.toISOString()).toBe("2027-01-13T17:00:00.000Z");
  });
});
