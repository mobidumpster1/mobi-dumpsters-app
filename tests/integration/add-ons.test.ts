import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ADD_ON_KEYS, enabledAddOnsForOrg, orgHasAddOn, parseAddOns, serializeAddOns } from "@/lib/addOns";
import { ACME_ORG_ID } from "../helpers/testOrg";

// Paid add-ons are switched on per business. Only the Acme test org is touched,
// and its original value is restored afterwards.
describe("per-business add-ons", () => {
  let original = "";
  let originalEnv: string | undefined;

  beforeAll(async () => {
    originalEnv = process.env.ENABLED_ADDONS;
    delete process.env.ENABLED_ADDONS; // a developer-machine override must not leak into these checks
    const org = await db.organization.findUniqueOrThrow({
      where: { id: ACME_ORG_ID },
      select: { enabledAddOns: true },
    });
    original = org.enabledAddOns;
  });

  afterAll(async () => {
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { enabledAddOns: original } });
    if (originalEnv !== undefined) process.env.ENABLED_ADDONS = originalEnv;
  });

  it("parses and serializes safely (unknown keys dropped, stable order, no duplicates)", () => {
    expect(parseAddOns("phone-agent, nonsense,secretary,secretary")).toEqual(["secretary", "phone-agent"]);
    expect(parseAddOns("")).toEqual([]);
    expect(parseAddOns(null)).toEqual([]);
    expect(serializeAddOns(["phone-agent", "bogus"])).toBe("phone-agent");
    expect(ADD_ON_KEYS).toEqual(["secretary", "phone-agent"]);
  });

  it("is off by default and follows the business's own switch", async () => {
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { enabledAddOns: "" } });
    expect(await enabledAddOnsForOrg(ACME_ORG_ID)).toEqual([]);
    expect(await orgHasAddOn(ACME_ORG_ID, "secretary")).toBe(false);

    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { enabledAddOns: "secretary" } });
    expect(await orgHasAddOn(ACME_ORG_ID, "secretary")).toBe(true);
    expect(await orgHasAddOn(ACME_ORG_ID, "phone-agent")).toBe(false);
  });

  it("the environment switch adds add-ons but never removes a business's own", async () => {
    await db.organization.update({ where: { id: ACME_ORG_ID }, data: { enabledAddOns: "phone-agent" } });
    process.env.ENABLED_ADDONS = "secretary";
    try {
      expect(await enabledAddOnsForOrg(ACME_ORG_ID)).toEqual(["secretary", "phone-agent"]);
    } finally {
      delete process.env.ENABLED_ADDONS;
    }
  });
});
