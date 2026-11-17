import { describe, expect, it } from "vitest";
import {
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  isLockedOut,
  nextFailureState,
  safeRedirectPath,
} from "@/lib/loginThrottle";

describe("login throttling", () => {
  const now = new Date("2026-11-16T12:00:00Z");

  it("locks on the Nth consecutive failure and flags it exactly once", () => {
    const before = { failedLoginAttempts: MAX_FAILED_ATTEMPTS - 1, lockedUntil: null };
    const after = nextFailureState(before, now);
    expect(after.justLocked).toBe(true);
    expect(after.lockedUntil?.getTime()).toBe(now.getTime() + LOCKOUT_MINUTES * 60_000);
  });

  it("does not lock before the threshold", () => {
    const after = nextFailureState({ failedLoginAttempts: 1, lockedUntil: null }, now);
    expect(after.lockedUntil).toBeNull();
    expect(after.justLocked).toBe(false);
  });

  it("starts counting over once a previous lock has expired (regression: lockout used to turn itself off)", () => {
    const expired = {
      failedLoginAttempts: MAX_FAILED_ATTEMPTS,
      lockedUntil: new Date(now.getTime() - 60_000),
    };
    const after = nextFailureState(expired, now);
    expect(after.failedLoginAttempts).toBe(1);
    expect(after.lockedUntil).toBeNull();

    // ...and the full run of failures after that locks again.
    let state: { failedLoginAttempts: number; lockedUntil: Date | null } = after;
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) state = nextFailureState(state, now);
    expect(state.lockedUntil).not.toBeNull();
  });

  it("reports lock status only while the lock is in the future", () => {
    expect(isLockedOut({ failedLoginAttempts: 5, lockedUntil: new Date(now.getTime() + 1000) }, now)).toBe(true);
    expect(isLockedOut({ failedLoginAttempts: 5, lockedUntil: new Date(now.getTime() - 1000) }, now)).toBe(false);
    expect(isLockedOut({ failedLoginAttempts: 0, lockedUntil: null }, now)).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("allows normal same-site paths", () => {
    expect(safeRedirectPath("/bookings?status=pending")).toBe("/bookings?status=pending");
  });

  it("rejects protocol-relative and external destinations", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
    expect(safeRedirectPath(null)).toBe("/");
  });
});
