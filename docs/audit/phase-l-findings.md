# Phase L Findings — Engineering, Testing, Backups & Operations

Run 2026-09-16. Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T170–T187); this is the durable, in-repo summary.

## The single biggest finding of the whole audit

**T174, T175, T178 — there is no automated test suite at all.** `package.json` has no test script, no test-runner dependency of any kind (Jest, Vitest, Mocha, Playwright, Cypress, Testing Library — none present), and a repo-wide search for `*.test.ts*`/`*.spec.ts*` found zero files. Every bug this audit found and fixed — the double-booking race, the promo-code race, the cross-tenant invoice leak, the cancellation-availability bug — was caught by hand, through live manual testing against the Acme test org. Nothing stops any of them from silently regressing the next time this code is touched. This is the highest-priority gap in the entire codebase, ahead of any individual bug found in phases A–K.

## Other real gaps found, not fixed

- **T176 — no database-level backstop against double-booking, and the staff-side path is still fully open.** No `@unique`/`@@unique` constraint protects against a booking-date overlap on the same equipment item — that invariant lives entirely in the Serializable-transaction fix applied this session to the *public* checkout path. The internal staff-facing `createBooking` action does a plain `db.booking.create` with no transaction and no availability re-check at all — the exact same race fixed publicly this session is still open on the staff booking form.
- **T179 — zero database indexes anywhere.** Grepped the whole schema for `@@index`: none exist. Every tenant-scoped query relies purely on the implicit index from `@id`/`@unique`. Invisible at Mobi's current data volume, but every list/report/calendar query will degrade toward a full-table scan as data and tenant count grow.
- **T180 — no pagination anywhere.** Invoices and Bookings list pages both fetch everything with no `take` (literally named `allInvoices`/`allBookings`), same pattern already found in Reports. Fine today, no fallback once row counts grow.
- **T177 — every money field is `Float`, not `Decimal`.** The well-known currency-rounding bug class. Practical risk is real but contained: plain addition rarely shows drift, but the app does real percentage-based math on money (tax rate, promo discounts, seasonal surcharges) where binary floating-point imprecision can produce a genuine off-by-a-cent total.
- **T172 — the hand-written-migration convention is real but undocumented.** This project genuinely writes SQL by hand under `prisma/migrations/<name>/migration.sql` (confirmed via real examples in the repo) rather than relying solely on `prisma migrate dev` — but neither `CLAUDE.md` nor `AGENTS.md` mentions it anywhere. Institutional knowledge only.

## Couldn't verify from the codebase — needs Chase directly

- **T170, T171** — whether Vercel's actual deployed environment (Production vs Preview variables, running Node version) matches local `package.json`/`.env` needs a look at Vercel's own dashboard.
- **T183, T184** — backup coverage (Neon point-in-time recovery settings, Vercel Blob retention) and whether a restore has ever actually been proven to work are entirely dashboard/operational questions, not answerable by reading code.

## Not built (Create-type, deferred to your prioritization)

T173 (a comprehensive pre-built staging dataset — the Acme test org exists and worked for everything this audit needed, but isn't pre-loaded with bundles/partial-payments/edge cases by default), T181 (monitoring/alerting — nothing aggregates the scattered error signals found throughout this audit), T182 (correlation IDs tracing one event across action → job → integration → record), T185 (a written rollback/incident-response procedure), T186 (a release checklist — would be a meaningful stopgap given no automated tests), T187 (a plain-language, owner-facing system-health page).
