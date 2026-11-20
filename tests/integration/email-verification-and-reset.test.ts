import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Capture the emails instead of sending them.
const sent: { to: string; subject: string; body: string }[] = [];
vi.mock("@/lib/email", () => ({
  siteOrigin: () => "http://localhost",
  sendNotificationEmail: async () => undefined,
  sendCustomerEmail: async (to: string, subject: string, body: string) => {
    sent.push({ to, subject, body });
  },
}));

import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  applyEmailVerification,
  applyPasswordReset,
  isPasswordResetTokenValid,
  sendEmailVerification,
  sendPasswordResetIfAccountExists,
} from "@/lib/verification";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Email verification and password reset: the links work once, expire, never
// reveal whether an account exists, can't be used to flood an inbox, and a
// password reset also lifts a login lockout.

const email = `${testId("verify")}@example.test`.toLowerCase();
let userId = "";

function tokenFrom(body: string): string {
  const match = body.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("no token link in email");
  return match[1];
}

beforeAll(async () => {
  const user = await db.user.create({
    data: {
      name: "Verify Tester",
      email,
      passwordHash: hashPassword("old-password-123"),
      role: "staff",
      organizationId: ACME_ORG_ID,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 15 * 60_000),
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await db.user.delete({ where: { id: userId } }); // tokens cascade
});

describe("email verification", () => {
  it("emails a link that verifies the account once, and not a second time", async () => {
    await sendEmailVerification({ id: userId, email, name: "Verify Tester", organizationName: "Acme" });
    const mail = sent.find((m) => m.to === email && /verify/i.test(m.subject));
    expect(mail).toBeTruthy();
    const token = tokenFrom(mail!.body);

    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt).toBeNull();
    expect(await applyEmailVerification(token)).toEqual({ ok: true });
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt).not.toBeNull();
    expect(await applyEmailVerification(token)).toMatchObject({ ok: false });
    expect(await applyEmailVerification("not-a-real-token")).toMatchObject({ ok: false });
  });

  it("won't send a second verification email inside the cooldown", async () => {
    const before = sent.filter((m) => m.to === email).length;
    await sendEmailVerification({ id: userId, email, name: "Verify Tester", organizationName: "Acme" });
    await sendEmailVerification({ id: userId, email, name: "Verify Tester", organizationName: "Acme" });
    expect(sent.filter((m) => m.to === email).length).toBe(before + 1);
  });
});

describe("password reset", () => {
  it("sends nothing for an address that has no account", async () => {
    const before = sent.length;
    await sendPasswordResetIfAccountExists(`nobody-${Date.now()}@example.test`);
    expect(sent.length).toBe(before);
  });

  it("emails a one-hour link, changes the password once, and lifts the lockout", async () => {
    await sendPasswordResetIfAccountExists(email);
    const mail = sent.filter((m) => m.to === email && /reset/i.test(m.subject)).at(-1);
    expect(mail).toBeTruthy();
    const token = tokenFrom(mail!.body);
    expect(await isPasswordResetTokenValid(token)).toBe(true);

    expect(await applyPasswordReset(token, hashPassword("new-password-456"))).toEqual({ ok: true });
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(verifyPassword("new-password-456", user.passwordHash)).toBe(true);
    expect(verifyPassword("old-password-123", user.passwordHash)).toBe(false);
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();

    // Used links are dead.
    expect(await isPasswordResetTokenValid(token)).toBe(false);
    expect(await applyPasswordReset(token, hashPassword("another-789"))).toMatchObject({ ok: false });
  });

  it("won't send a second reset email inside the cooldown, and an expired link is refused", async () => {
    const before = sent.filter((m) => m.to === email && /reset/i.test(m.subject)).length;
    await sendPasswordResetIfAccountExists(email);
    await sendPasswordResetIfAccountExists(email);
    expect(sent.filter((m) => m.to === email && /reset/i.test(m.subject)).length).toBe(before + 1);

    const token = tokenFrom(sent.filter((m) => m.to === email && /reset/i.test(m.subject)).at(-1)!.body);
    await db.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await isPasswordResetTokenValid(token)).toBe(false);
    expect(await applyPasswordReset(token, hashPassword("too-late-000"))).toMatchObject({ ok: false });
  });
});
