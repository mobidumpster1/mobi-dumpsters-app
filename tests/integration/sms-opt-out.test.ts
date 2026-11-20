import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applySmsKeyword, clearOptOut, isOptedOut, smsKeyword } from "@/lib/smsOptOut";
import { sendCustomerSms, sendLeadSms } from "@/lib/twilio";
import { ACME_ORG_ID } from "../helpers/testOrg";

// A customer who texts STOP is never texted again until they text START.
// Only the Acme test business is touched; nothing here reaches Twilio.

const digits = `478${String(Date.now()).slice(-7)}`;
const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

afterAll(async () => {
  await db.smsOptOut.deleteMany({ where: { organizationId: ACME_ORG_ID, phoneLast10: digits } });
});

describe("text-message opt-out", () => {
  it("recognises the carrier keywords only when they are the whole message", () => {
    for (const t of ["STOP", "stop", "Stop!", " unsubscribe ", "CANCEL", "End", "QUIT", "stopall"]) {
      expect(smsKeyword(t)).toBe("stop");
    }
    for (const t of ["START", "unstop", "Start."]) expect(smsKeyword(t)).toBe("start");
    for (const t of ["please stop by tomorrow", "stop sending", "yes", "ok", "", "how much to cancel my booking"]) {
      expect(smsKeyword(t)).toBeNull();
    }
  });

  it("remembers an opt-out whichever way the number is written, then forgets it on START", async () => {
    expect(await isOptedOut(ACME_ORG_ID, formatted)).toBe(false);
    expect(await applySmsKeyword(ACME_ORG_ID, `+1${digits}`, "STOP")).toBe("stop");
    expect(await isOptedOut(ACME_ORG_ID, formatted)).toBe(true);
    expect(await isOptedOut(ACME_ORG_ID, digits)).toBe(true);
    // Saying STOP twice is fine.
    expect(await applySmsKeyword(ACME_ORG_ID, `+1${digits}`, "stop")).toBe("stop");
    expect(await db.smsOptOut.count({ where: { organizationId: ACME_ORG_ID, phoneLast10: digits } })).toBe(1);

    expect(await applySmsKeyword(ACME_ORG_ID, `+1${digits}`, "START")).toBe("start");
    expect(await isOptedOut(ACME_ORG_ID, digits)).toBe(false);
  });

  it("an ordinary message changes nothing", async () => {
    expect(await applySmsKeyword(ACME_ORG_ID, `+1${digits}`, "Can you come Friday?")).toBeNull();
    expect(await isOptedOut(ACME_ORG_ID, digits)).toBe(false);
  });

  it("is per business: another business's list doesn't block this one", async () => {
    // Opt out only for Acme; a different business id (never a real one) sees nothing.
    await applySmsKeyword(ACME_ORG_ID, `+1${digits}`, "STOP");
    expect(await isOptedOut("some-other-business-id", digits)).toBe(false);
    await clearOptOut(ACME_ORG_ID, digits);
  });

  it("staff can't text a customer who opted out, and the reason is plain", async () => {
    await applySmsKeyword(ACME_ORG_ID, `+1${digits}`, "STOP");
    await expect(sendCustomerSms(ACME_ORG_ID, { id: "unused", phone: formatted }, "hello")).rejects.toThrow(/opted out/);
    // Leads are skipped quietly (best-effort sends never throw).
    await expect(sendLeadSms(ACME_ORG_ID, formatted, "hello")).resolves.toBeUndefined();
  });
});
