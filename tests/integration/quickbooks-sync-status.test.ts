import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { recordSyncOutcome } from "@/lib/quickbooks";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression test for T093: a QuickBooks push failure (pushInvoicePayment/
// pushExpensePurchase, src/lib/quickbooks.ts) used to be caught by every
// caller and only ever logged to the server console — the local
// payment/expense correctly stayed recorded either way (the known-good
// part), but the sync failure itself was invisible anywhere in the app.
// recordSyncOutcome is the shared fix both push functions now go through;
// tested directly here with fake success/failure callbacks rather than a
// real QuickBooks API call, since mocking that HTTP layer isn't set up in
// this suite and isn't what this fix is actually about.
describe("QuickBooks sync status (T093 regression)", () => {
  const connectionId = { current: "" };

  beforeAll(async () => {
    const connection = await db.quickBooksConnection.create({
      data: {
        organizationId: ACME_ORG_ID,
        realmId: testId("qb-realm"),
        accessToken: "fake-access-token",
        refreshToken: "fake-refresh-token",
        accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    connectionId.current = connection.id;
  });

  afterEach(async () => {
    // Reset between tests so each one starts from a known state.
    await db.quickBooksConnection.update({
      where: { id: connectionId.current },
      data: { lastSyncedAt: null, lastSyncError: null },
    });
  });

  afterAll(async () => {
    await db.quickBooksConnection.deleteMany({
      where: { organizationId: ACME_ORG_ID, id: connectionId.current },
    });
  });

  it("records lastSyncedAt and clears lastSyncError on success", async () => {
    const result = await recordSyncOutcome(connectionId.current, async () => "ok");
    expect(result).toBe("ok");

    const connection = await db.quickBooksConnection.findUniqueOrThrow({
      where: { id: connectionId.current },
    });
    expect(connection.lastSyncedAt).not.toBeNull();
    expect(connection.lastSyncError).toBeNull();
  });

  it("records lastSyncError and re-throws on failure, without touching lastSyncedAt", async () => {
    await expect(
      recordSyncOutcome(connectionId.current, async () => {
        throw new Error("QuickBooks API returned 401 Unauthorized");
      })
    ).rejects.toThrow("QuickBooks API returned 401 Unauthorized");

    const connection = await db.quickBooksConnection.findUniqueOrThrow({
      where: { id: connectionId.current },
    });
    expect(connection.lastSyncError).toBe("QuickBooks API returned 401 Unauthorized");
    expect(connection.lastSyncedAt).toBeNull();
  });

  it("clears a previous failure once a later sync succeeds", async () => {
    await expect(
      recordSyncOutcome(connectionId.current, async () => {
        throw new Error("first attempt fails");
      })
    ).rejects.toThrow();

    let connection = await db.quickBooksConnection.findUniqueOrThrow({
      where: { id: connectionId.current },
    });
    expect(connection.lastSyncError).toBe("first attempt fails");

    await recordSyncOutcome(connectionId.current, async () => "recovered");

    connection = await db.quickBooksConnection.findUniqueOrThrow({
      where: { id: connectionId.current },
    });
    expect(connection.lastSyncError).toBeNull();
    expect(connection.lastSyncedAt).not.toBeNull();
  });
});
