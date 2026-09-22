import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ACME_ORG_ID } from "../helpers/testOrg";

// tenantGuard (src/lib/db.ts) is the runtime safety net this entire audit
// leaned on — it's what turns "a developer forgot organizationId" into an
// immediate thrown error instead of a silent cross-tenant data leak (see
// T112-T114, the real cross-tenant invoice leak this exact mechanism did
// NOT catch, because findUnique/findUniqueOrThrow are structurally exempt
// from it — that blind spot is covered separately in
// cross-tenant-isolation.test.ts). These tests guard the mechanism itself
// against a future refactor silently weakening it.
describe("tenantGuard", () => {
  it("blocks a list-style query on an org-scoped model with no organizationId in where", async () => {
    await expect(db.customer.findMany({ where: { name: "anyone" } })).rejects.toThrow(
      /Blocked unscoped findMany on Customer/
    );
  });

  it("blocks count/updateMany/deleteMany the same way", async () => {
    await expect(db.customer.count({ where: {} })).rejects.toThrow(/Blocked unscoped/);
    await expect(
      db.customer.updateMany({ where: { name: "anyone" }, data: { notes: "x" } })
    ).rejects.toThrow(/Blocked unscoped/);
    await expect(db.customer.deleteMany({ where: { name: "anyone" } })).rejects.toThrow(
      /Blocked unscoped/
    );
  });

  it("allows the same query once organizationId is present in where", async () => {
    await expect(
      db.customer.findMany({ where: { organizationId: ACME_ORG_ID, name: "nobody-real" } })
    ).resolves.toEqual([]);
  });

  it("allows organizationId nested inside an AND/OR", async () => {
    await expect(
      db.customer.findMany({
        where: { AND: [{ organizationId: ACME_ORG_ID }, { name: "nobody-real" }] },
      })
    ).resolves.toEqual([]);
  });

  it("still requires a non-empty reason to deliberately bypass the guard", () => {
    // Thrown synchronously (before the returned promise even exists), not
    // as a rejection — expect(fn).toThrow, not expect(promise).rejects.
    expect(() => db.$allowUnscoped("", () => db.customer.findMany({ where: {} }))).toThrow(
      /requires a reason/
    );
  });

  it("$allowUnscoped with a real reason genuinely bypasses the guard (the cron exception)", async () => {
    await expect(
      db.$allowUnscoped("test: confirming the deliberate-bypass path works", () =>
        db.customer.findFirst({ where: { organizationId: ACME_ORG_ID } })
      )
    ).resolves.not.toThrow();
  });
});
