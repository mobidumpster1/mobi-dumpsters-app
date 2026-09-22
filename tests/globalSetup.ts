// Runs once before the whole suite and once after — a belt-and-suspenders
// sweep for vitest-prefixed rows left behind by an interrupted previous
// run, on top of each test file's own afterAll cleanup. Scoped entirely
// to the Acme test org (see tests/helpers/testOrg.ts).
export default async function globalSetup() {
  const { cleanupTestFixtures } = await import("./helpers/testOrg");
  await cleanupTestFixtures();

  return async () => {
    await cleanupTestFixtures();
  };
}
