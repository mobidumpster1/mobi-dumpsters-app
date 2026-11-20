import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getSetupChecklist } from "@/lib/onboarding";
import { ACME_ORG_ID, cleanupTestFixtures, testId } from "../helpers/testOrg";

// The "Get your booking page live" checklist ticks itself off from real data.
// Only the Acme test business is touched, and its settings are restored.

const step = async (id: string) => (await getSetupChecklist(ACME_ORG_ID)).steps.find((s) => s.id === id)!;

let original: { contactPhone: string | null; contactAddress: string | null };
let originalAgreement = "";
let categoryId = "";

beforeAll(async () => {
  original = await db.organization.findUniqueOrThrow({
    where: { id: ACME_ORG_ID },
    select: { contactPhone: true, contactAddress: true },
  });
  const agreement = await db.serviceAgreementSettings.findUnique({ where: { organizationId: ACME_ORG_ID } });
  originalAgreement = agreement?.content ?? "";
});

afterAll(async () => {
  await db.organization.update({ where: { id: ACME_ORG_ID }, data: original });
  if (originalAgreement) {
    await db.serviceAgreementSettings.updateMany({ where: { organizationId: ACME_ORG_ID }, data: { content: originalAgreement } });
  }
  await db.pricingTier.deleteMany({ where: { categoryId } });
  await cleanupTestFixtures();
});

describe("setup checklist", () => {
  it("needs both a phone and an address for the business step", async () => {
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { contactPhone: null, contactAddress: null } });
    expect((await step("business")).done).toBe(false);
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { contactPhone: "(555) 010-2030" } });
    expect((await step("business")).done).toBe(false);
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { contactAddress: "1 Test St, Testville, GA" } });
    expect((await step("business")).done).toBe(true);
  });

  it("knows the agreement is still the placeholder until it is rewritten", async () => {
    await db.serviceAgreementSettings.upsert({
      where: { organizationId: ACME_ORG_ID },
      create: { organizationId: ACME_ORG_ID, content: "[Placeholder — replace this" },
      update: { content: "[Placeholder — replace this" },
    });
    expect((await step("agreement")).done).toBe(false);
    await db.serviceAgreementSettings.update({ where: { organizationId: ACME_ORG_ID }, data: { content: "By renting you agree to the following terms." } });
    expect((await step("agreement")).done).toBe(true);
  });

  it("a priced category with a working unit ticks the equipment steps and shows on the booking page", async () => {
    const category = await db.equipmentCategory.create({
      data: {
        organizationId: ACME_ORG_ID,
        name: testId("setup-20 Yard"),
        dumpsAtOwnYard: true,
        pricingTiers: { create: [{ label: "7 Day", days: 7, price: 375, sortOrder: 0 }] },
      },
    });
    categoryId = category.id;
    await db.equipmentItem.create({ data: { organizationId: ACME_ORG_ID, categoryId, label: testId("setup-unit") } });

    const checklist = await getSetupChecklist(ACME_ORG_ID);
    for (const id of ["categories", "units", "prices", "visible"]) {
      expect(checklist.steps.find((s) => s.id === id)!.done, id).toBe(true);
    }
    expect(checklist.requiredTotal).toBe(6);
    expect(checklist.steps.find((s) => s.id === "stripe")!.required).toBe(false);
  });

  it("is complete only when every required step is done", async () => {
    const checklist = await getSetupChecklist(ACME_ORG_ID);
    // Business, agreement and equipment steps were all satisfied above.
    expect(checklist.requiredDone).toBe(checklist.requiredTotal);
    expect(checklist.complete).toBe(true);
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { contactPhone: null } });
    const after = await getSetupChecklist(ACME_ORG_ID);
    expect(after.complete).toBe(false);
    expect(after.requiredDone).toBe(after.requiredTotal - 1);
  });
});
