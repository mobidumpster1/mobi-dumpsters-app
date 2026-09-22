import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests here are real integration tests against the actual dev Neon
// database (see tests/helpers/testOrg.ts) — there's no separate test DB
// or mock Prisma layer in this project, and the bugs these tests guard
// (Postgres Serializable-transaction races, the tenantGuard extension)
// only reproduce against a real Postgres connection anyway. Every test
// must go through createTestFixtures/cleanupTestFixtures so nothing is
// ever written to the real Mobi Dumpsters org — see that file's own
// comment for the full rule.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // See tests/stubs/server-only.ts for why this is stubbed.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    testTimeout: 20_000,
    // DB-hitting integration tests interfere with each other if run
    // concurrently against shared fixture rows (e.g. the promo-code
    // redemption-cap test) — sequential is slower but deterministic.
    fileParallelism: false,
  },
});
