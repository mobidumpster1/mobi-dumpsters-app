<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database migrations

Migrations in this project are written by hand, not generated with `prisma migrate dev`. Create a new folder under `prisma/migrations/<YYYYMMDD>_<short_description>/migration.sql` containing plain SQL (`ALTER TABLE ...`, backfill `UPDATE`s, etc.), matching whatever change was just made in `prisma/schema.prisma`. Apply it with `npx prisma migrate deploy`, then `npx prisma generate` (stop any running dev server first — on Windows the query engine DLL it holds open will block `generate` with an `EPERM` file-lock error). Never edit an already-applied migration file after the fact; write a new one instead, even to fix a mistake in the previous one.

# Automated tests

Run with `npm test` (Vitest). Every test in `tests/` is a real integration test against the actual dev database, scoped exclusively to the persistent "Acme Rentals (Test Business)" organization (see `tests/helpers/testOrg.ts`) — there's no mock Prisma layer, because the bugs these tests guard against (Postgres Serializable-transaction races, the `tenantGuard` extension in `src/lib/db.ts`) only reproduce against a real Postgres connection. Never write a test that reads or writes the real Mobi Dumpsters org's data.
