import { db } from "@/lib/db";

// The persistent "Acme Rentals (Test Business)" org — the ONLY org any
// test in this suite is allowed to read or write. Never import or
// reference the real Mobi Dumpsters org id here, in a fixture, or in a
// test file. Every fixture helper below takes this id implicitly so a
// test can't accidentally target another org by passing the wrong one.
export const ACME_ORG_ID = "cmrfqtpl200007csso9satr7c";

// Prefixes every throwaway row's identifying field so cleanup can find
// everything a test created by pattern-matching, even if a test forgets
// to track an id — a second line of defense on top of explicit deletion.
export const TEST_PREFIX = "vitest-";

export function testId(label: string): string {
  return `${TEST_PREFIX}${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Deletes every row this test run could plausibly have created, scoped
// to ACME_ORG_ID and the TEST_PREFIX naming convention, in FK-safe
// order. Call from an afterEach — cheap, and means a failed assertion
// earlier in a test still leaves the org clean for the next one.
export async function cleanupTestFixtures(): Promise<void> {
  await db.bookingItem.deleteMany({
    where: { booking: { organizationId: ACME_ORG_ID, notes: { startsWith: TEST_PREFIX } } },
  });
  await db.booking.deleteMany({
    where: { organizationId: ACME_ORG_ID, notes: { startsWith: TEST_PREFIX } },
  });
  await db.equipmentItem.deleteMany({
    where: { organizationId: ACME_ORG_ID, label: { startsWith: TEST_PREFIX } },
  });
  await db.equipmentCategory.deleteMany({
    where: { organizationId: ACME_ORG_ID, name: { startsWith: TEST_PREFIX } },
  });
  await db.promoCode.deleteMany({
    where: { organizationId: ACME_ORG_ID, code: { startsWith: TEST_PREFIX } },
  });
  await db.customer.deleteMany({
    where: { organizationId: ACME_ORG_ID, name: { startsWith: TEST_PREFIX } },
  });
  await db.invoice.deleteMany({
    where: { organizationId: ACME_ORG_ID, invoiceNumber: { startsWith: TEST_PREFIX } },
  });
  // QuickBooksConnection is @unique per organizationId — a leftover test
  // row here doesn't just look messy, it blocks every future test run's
  // own db.quickBooksConnection.create() with a unique-constraint error
  // until cleaned up, so this one is swept even though nothing else
  // currently creates more than one throwaway row of it.
  await db.quickBooksConnection.deleteMany({
    where: { organizationId: ACME_ORG_ID, realmId: { startsWith: TEST_PREFIX } },
  });
}

// Fails loudly (rather than silently doing nothing) if a test somehow
// left real-looking rows behind — call at the end of a describe block's
// last afterEach/afterAll for extra confidence beyond the per-test
// cleanup above.
export async function assertNoLeftoverFixtures(): Promise<void> {
  const [bookings, categories, promoCodes, customers] = await Promise.all([
    db.booking.count({ where: { organizationId: ACME_ORG_ID, notes: { startsWith: TEST_PREFIX } } }),
    db.equipmentCategory.count({ where: { organizationId: ACME_ORG_ID, name: { startsWith: TEST_PREFIX } } }),
    db.promoCode.count({ where: { organizationId: ACME_ORG_ID, code: { startsWith: TEST_PREFIX } } }),
    db.customer.count({ where: { organizationId: ACME_ORG_ID, name: { startsWith: TEST_PREFIX } } }),
  ]);
  const total = bookings + categories + promoCodes + customers;
  if (total > 0) {
    throw new Error(
      `${total} leftover test fixture row(s) still exist in the Acme org after cleanup (bookings=${bookings}, categories=${categories}, promoCodes=${promoCodes}, customers=${customers}).`
    );
  }
}
