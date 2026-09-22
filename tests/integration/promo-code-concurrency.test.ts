import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression test for T058: promo redemption limits used to be a plain
// check-then-increment with no transaction (validatePromoCode's cap check
// happened well before recordPromoCodeRedemption's separate increment),
// so two concurrent checkouts could both squeeze through a max-1-use
// code. The fix folds the re-check and the increment into the same
// Serializable transaction as the booking-creation write — this test
// reproduces just that fragment against a throwaway max-1 code.
describe("promo code redemption concurrency (T058 regression)", () => {
  const promoId = { current: "" };

  beforeAll(async () => {
    const promo = await db.promoCode.create({
      data: {
        organizationId: ACME_ORG_ID,
        code: testId("race-promo").toUpperCase(),
        type: "percent",
        value: 10,
        maxRedemptions: 1,
        redemptionCount: 0,
      },
    });
    promoId.current = promo.id;
  });

  afterAll(async () => {
    await db.promoCode.deleteMany({ where: { id: promoId.current } });
  });

  async function attemptRedemption() {
    return db.$transaction(
      async (tx) => {
        const promo = await tx.promoCode.findUniqueOrThrow({ where: { id: promoId.current } });
        if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
          throw new Error("Sorry, that promo code was just fully redeemed.");
        }
        return tx.promoCode.update({
          where: { id: promoId.current },
          data: { redemptionCount: { increment: 1 } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  it("lets exactly one of two concurrent redemptions succeed on a max-1-use code", async () => {
    const results = await Promise.allSettled([attemptRedemption(), attemptRedemption()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const final = await db.promoCode.findUniqueOrThrow({ where: { id: promoId.current } });
    expect(final.redemptionCount).toBe(1);
  });
});
