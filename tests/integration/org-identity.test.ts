import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Email settings are read when the email module loads, so set them first.
vi.stubEnv("RESEND_API_KEY", "test-key");
vi.stubEnv("BUSINESS_NOTIFICATION_EMAIL", "platform@platform.example.test");
vi.stubEnv("RESEND_FROM_EMAIL", "Platform <noreply@platform.example.test>");

import { db } from "@/lib/db";
import { getOrgContact } from "@/lib/orgContact";
import { getOrgBranding, NEUTRAL_BRAND_COLOR } from "@/lib/orgBranding";
import { ACME_ORG_ID } from "../helpers/testOrg";

// A business that hasn't filled in its identity gets a blank one, never
// another business's: no borrowed logo, phone or inbox, and the emails it
// sends are in its own name with replies going to its own owner.

type Sent = { from: string; to: string; reply_to?: string; html: string; subject: string };
const sent: Sent[] = [];
const realFetch = globalThis.fetch;
let original: { contactPhone: string | null; notificationEmail: string | null; contactAddress: string | null; logoUrl: string | null; primaryColor: string | null };

beforeAll(async () => {
  // Pin Acme's identity fields to "not filled in", restoring them afterwards.
  original = await db.organization.findUniqueOrThrow({
    where: { id: ACME_ORG_ID },
    select: { contactPhone: true, notificationEmail: true, contactAddress: true, logoUrl: true, primaryColor: true },
  });
  await db.organization.update({
    where: { id: ACME_ORG_ID },
    data: { contactPhone: null, notificationEmail: null, contactAddress: null, logoUrl: null, primaryColor: null },
  });
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    sent.push(JSON.parse(init?.body ?? "{}"));
    return new Response(JSON.stringify({ id: "resend-test-id" }), { status: 200 });
  }) as typeof fetch;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await db.organization.update({ where: { id: ACME_ORG_ID }, data: original });
  vi.unstubAllEnvs();
});

describe("a business with nothing filled in", () => {
  it("has a blank contact profile and its own owner as the alert inbox", async () => {
    const contact = await getOrgContact(ACME_ORG_ID);
    expect(contact.businessName).toBe("Acme Rentals (Test Business)");
    expect(contact.phone).toBe("");
    expect(contact.address).toBeNull();
    expect(contact.logoUrl).toBeNull();
    expect(contact.email).toBe("owner@acmerentals-test.com");
    expect(contact.notificationEmail).toBe("owner@acmerentals-test.com");
  });

  it("uses what it sets: its own alert inbox beats the owner's login email", async () => {
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { notificationEmail: "alerts@acme.example.test" } });
    expect((await getOrgContact(ACME_ORG_ID)).email).toBe("alerts@acme.example.test");
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { notificationEmail: null } });
  });

  it("gets no logo and a neutral color, not another business's", async () => {
    const brand = await getOrgBranding(ACME_ORG_ID);
    expect(brand.logoUrl).toBeNull();
    expect(brand.primaryColor).toBe(NEUTRAL_BRAND_COLOR);
  });
});

describe("emails sent on behalf of a business", () => {
  it("are in that business's name, and replies go to its own owner", async () => {
    const { sendCustomerEmail } = await import("@/lib/email");
    sent.length = 0;
    await sendCustomerEmail("customer@example.test", "Your booking", "Hello there.", undefined, ACME_ORG_ID, { untracked: true });
    const mail = sent.at(-1)!;
    expect(mail.from).toBe("Acme Rentals (Test Business) <noreply@platform.example.test>");
    expect(mail.reply_to).toBe("owner@acmerentals-test.com");
    expect(mail.html).toContain("Acme Rentals (Test Business)");
    expect(mail.html).not.toMatch(/Mobi/i);
    expect(mail.html).not.toContain("478");
    expect(mail.html).not.toContain("<img"); // no logo set
  });

  it("show the business's logo and phone once it sets them", async () => {
    await db.organization.update({
      where: { id: ACME_ORG_ID },
      data: { logoUrl: "https://cdn.example.test/acme.png", contactPhone: "(555) 010-2030", primaryColor: "#aa3311" },
    });
    const { sendCustomerEmail } = await import("@/lib/email");
    sent.length = 0;
    await sendCustomerEmail("customer@example.test", "Hi", "Hello.", undefined, ACME_ORG_ID, { untracked: true });
    const mail = sent.at(-1)!;
    expect(mail.html).toContain('src="https://cdn.example.test/acme.png"');
    expect(mail.html).toContain("(555) 010-2030");
    expect(mail.html).toContain("#aa3311");
  });

  it("are plain and platform-level when no business is given", async () => {
    const { sendCustomerEmail } = await import("@/lib/email");
    sent.length = 0;
    await sendCustomerEmail("someone@example.test", "Notice", "Plain notice.");
    const mail = sent.at(-1)!;
    expect(mail.from).toBe("Platform <noreply@platform.example.test>");
    expect(mail.reply_to).toBe("platform@platform.example.test");
    expect(mail.html).not.toContain("<img");
    expect(mail.html).not.toMatch(/Mobi/i);
  });
});
