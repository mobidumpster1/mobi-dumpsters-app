# Phase A Findings — Security & Tenant Isolation

Run 2026-09-16. Full detail on each ticket lives on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T111–T129); this is the durable, in-repo summary.

## Fixed during this pass

**T112, T113, T114 — cross-tenant invoice data leak (P0, live in production).** Three call sites in `src/app/book/` (`thank-you/page.tsx`, and `payBookingInvoiceNow`/`confirmCardSetup` in `actions.ts`) looked up an invoice by a client-supplied ID with no organization check, on the app's public, unauthenticated checkout flow. Anyone holding a valid invoice ID from *any* tenant could read that invoice's amount and the customer's name/email/phone, and trigger a real Stripe Checkout session against it. Fixed by scoping all three lookups to the resolved organization (`findFirst`/`findFirstOrThrow` with `organizationId`, matching the pattern already used correctly elsewhere in the app). Verified live: a cross-tenant test invoice correctly returns nothing after the fix; a same-tenant invoice still displays correctly. Test data created and fully deleted afterward. Also corrected an overstated claim in the capability report ("the code physically can't run an unscoped query by accident") that this exact finding disproves — `findUnique`/`findUniqueOrThrow` are structurally exempt from the automated tenant guard, which is exactly where this bug lived.

## Confirmed OK (verified, no gap found)

- **T118** — server-side permission checks (`requirePermission`) are genuinely in use across 13 files, not dead code.
- **T119** — driver-only account lockdown is enforced in the shared internal layout, not per-page (so it can't be forgotten on a new route).
- **T121** — 2FA backup codes and API keys are properly hashed (SHA-256, appropriate for high-entropy random secrets — unlike passwords, which correctly use scrypt).
- **T127** — platform-admin impersonation logging correctly captures both the real admin's identity and the impersonated org.
- **T129** — webhook and API route logging doesn't leak request bodies, tokens, or payment details (spot-checked, not exhaustive).

## Real gaps found, not yet fixed (flagged for a decision or a future pass)

- **T115** — all 8 Vercel cron routes are effectively unauthenticated today: their `CRON_SECRET` check silently no-ops when the env var is unset, and it *is* unset. Anyone can trigger review-request emails, reminder sends, or the Google syncs on demand.
- **T117** — no automated test suite exists at all (no test runner configured, zero test files). This is the single most consequential gap in the whole audit — every other finding here was caught by manual reading, which doesn't scale and won't catch a regression.
- **T120** — no login throttling/rate limiting; the login form has no brute-force protection.
- **T123** — `Quote.publicToken` and `DemolitionAgreement.publicToken` never expire and can't be revoked short of deleting the record.
- **T125** — `/api/blob-upload` has no authentication at all; anyone can obtain an upload token for up to 500MB to Mobi's Vercel Blob storage.
- **T128** — no security-alerting mechanism exists (failed logins, credential changes, unusual exports all go unnoticed).
- **T116, T124** — recorded as `needs_decision` rather than `issue`: tenant isolation relies entirely on the application layer with no database-level backstop (a real architectural question, not a quick fix), and Blob file URLs are unguessable-but-unauthenticated (a common, defensible tradeoff whose acceptability depends on how sensitive specific document types are — worth Chase's explicit call).

## Not run

- **T111** — enabling MFA on the owner account requires Chase's own phone/authenticator app; not something I can do.
- **T122** — already handled in an earlier review pass (see AUDIT_INSTRUCTIONS.md's "Known findings" section — the data export needs regeneration with one more field redacted; not yet done, pending Chase's go-ahead).
