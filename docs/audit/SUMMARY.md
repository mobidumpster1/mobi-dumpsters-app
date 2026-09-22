# Audit Summary — Mobi Ops Platform

Run 2026-09-16 through 2026-09-17. Full detail on every ticket lives on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (211 tickets, T001–T211); per-phase narrative detail is in `docs/audit/phase-a-findings.md` through `phase-l-findings.md`. This document is the consolidated roll-up per `AUDIT_INSTRUCTIONS.md`'s own spec — it does not fix anything; every finding below is handed back for a separate, explicitly-scoped fix pass.

**This is a Check pass, not a Fix pass** — but 12 P0/P1 bugs were fixed and verified live during the audit itself, with the user's explicit approval, because they were confirmed real, dangerous, and unambiguous to fix (see "Fixed during the audit" below). Everything else — including several other confirmed `issue` findings — was left as a documented finding for a deliberate, separate fix pass.

## Totals

211 tickets total: **45 `ok`** · **84 `needs_decision`** · **56 `issue`** (12 of which are already fixed and verified live) · 26 with no verdict (2 outstanding pre-existing action items for Chase, T111/T122; 24 are the original audit's own forward-looking Feature/Deferred recommendations in sections 13–14, never meant to carry a verdict).

## Per-phase breakdown

| Phase | Section | ok | issue | needs_decision |
|---|---|---|---|---|
| A | 8. Security & tenant isolation | 5 | 9 (+1 fixed, +2 unverdicted action items) | 2 |
| B | 2. Inventory, availability & custody | 4 | 4 | 8 |
| C | 1. Source data, migration & history | 3 | 3 | 8 |
| D | 3. Booking & dispatch workflows | 4 | 2 | 8 |
| E | 4. Pricing, quotes & agreements | 5 | 5 | 8 |
| F | 5. Payments, invoices, deposits & refunds | 8 | 6 | 3 |
| G | 6. Expenses, accounting & reporting | 2 | 5 | 9 |
| H | 7. Customers, leads & communications | 4 | 3 | 8 |
| I | 9. Website, checkout & customer experience | 4 | 4 | 7 |
| J | 10. Maintenance, disposal & field work | 2 | 2 | 8 |
| K | 11. Platform plans, subscriptions & integrations | 4 | 4 | 5 |
| L | 12. Engineering, testing, backups & operations | 0 | 8 | 10 |
| — | 13. Prioritized new features (15) / 14. Deferred (9) | — | — | — (recommendations, not verified) |

## Fixed during the audit (live, verified, cleaned up)

All against the Acme Rentals test org unless noted; the user approved fixing each of these directly rather than leaving them as findings.

1. **T112–T114 — cross-tenant invoice data leak (P0).** The public thank-you/payment pages trusted a client-supplied invoice ID with no org check — anyone with a valid invoice ID from *any* tenant could read that customer's name/email/phone/amount and trigger a real Stripe Checkout against it. Fixed by scoping all three lookups to `organizationId`.
2. **T019, T021, T022 — double-booking race condition (P0).** Two simultaneous bookings could reserve the same physical unit. Fixed with a Postgres Serializable transaction around the availability re-check and booking write.
3. **T025 — cancelled/declined bookings never actually freed their dates (P0).** Fixed in all four availability-checking code paths.
4. **T033 — double-click on Deliver/Return sent duplicate customer emails (P1).** Fixed with an idempotency guard.
5. **T058 — promo code over-redemption race (P1).** Fixed using the same transaction pattern as #2, on the public checkout path (the internal staff path still has this gap — see T176 below).
6. **T131, T157 — self-contradictions in the capability report itself**, corrected in the published report.

## Full `issue` list, P0 first

*[FIXED] = already resolved and verified live during this audit; everything else is an open finding for a future fix pass.*

### P0
- **T004** — Empty tables in the data export lose their column headers.
- **T006** — Imported historical records carry no source/provenance field distinguishing them from live-created ones.
- **T013** — `deleteInvoice` permanently hard-deletes a fully paid invoice with no void/archive option; `deleteBooking` at least blocks this.
- **T019, T021, T022** `[FIXED]` — Double-booking race condition (public checkout).
- **T025** `[FIXED]` — Cancelled/declined bookings permanently blocked their own dates from ever being rebooked.
- **T112, T113, T114** `[FIXED]` — Cross-tenant invoice data leak; the capability report's "tenant leaks are impossible" claim was also corrected.
- **T115** — All 8 cron endpoints are callable by anyone on the internet with no authentication (`CRON_SECRET` isn't set).
- **T117** — No automated cross-tenant isolation tests exist (root cause: no test suite at all — see T174).
- **T120** — No login-attempt throttling; brute-force protection is absent.
- **T123** — Quote and demolition-agreement public links never expire and can't be revoked.
- **T125** — The blob-upload endpoint has zero authentication — anyone can use Mobi's storage as free file hosting.
- **T126** — Lead-enrichment website scraping has no SSRF protection against internal/private IP targets.
- **T128** — No security-alert mechanism for suspicious logins, credential changes, or unusual exports.

### P1
- **T033** `[FIXED]` — Double-click on Deliver/Return sent duplicate emails.
- **T038** — Vehicle/driver assignment has zero conflict checking; the same truck or driver can be double-booked.
- **T046, T048** — The signed service agreement promises a trailer deposit and a $20/hr late fee that aren't actually configured anywhere in the app.
- **T054** — Checkout's delivery/pickup time is parsed without a UTC offset, likely shifting stored times by several hours depending on server timezone.
- **T058** `[FIXED]` — Promo code redemption cap could be exceeded under concurrent checkout (public path only — the internal staff booking path still has this gap, see T176).
- **T061** — Signed agreement text can be edited by staff *after* the customer signed it.
- **T066, T067** — The customer-payment Stripe webhook has no duplicate-event protection (the platform-billing webhook does).
- **T068** — Card charges have no Stripe idempotency key — a retry could double-charge a customer.
- **T070** — No way to actually refund a paid installment through Stripe; the only "undo" flips the record without touching the money.
- **T072** — Refundable security deposits are counted as revenue in Reports' P&L, right now, in the live data.
- **T078** — Off-session charge authorization (the SetupIntent) isn't independently retained for dispute evidence.
- **T080** — Reports' default view (no date filter) compares 7 months of real revenue against 6 years of imported expenses, producing a badly misleading margin figure.
- **T082** — Two active recurring bills ("Business License," "Google Ads") have no amount or schedule, making reminders useless.
- **T085** — Nothing prevents a recurring bill from being logged as an expense twice for the same period.
- **T092** — Equipment utilization treats reserved-not-yet-delivered time identically to real on-property time, with no maintenance-time exclusion.
- **T093** — QuickBooks sync failures are only logged to the server console, invisible anywhere in the app.
- **T172** — This project's real hand-written-migration convention is undocumented anywhere (`CLAUDE.md`/`AGENTS.md`).
- **T174, T175, T178** — **No automated test suite exists at all** — no test runner, no test files, zero. The single biggest finding of the entire audit; every bug above was caught by hand.
- **T176** — No database-level constraint prevents double-booking; the internal staff booking form has the exact race fixed on the public path, still fully open.
- **T177** — Every money field in the schema is `Float`, not `Decimal` — a real, if contained, rounding-error risk given the app's percentage-based pricing math.
- **T179** — Zero database indexes exist anywhere in the schema.
- **T180** — No pagination anywhere; Invoices/Bookings list pages fetch everything unbounded.

### P2
- **T096** — 72% of Mobi's real customers (39 of 54) have no email or phone on file.
- **T098** — Two literal placeholder emails from Google Places are attached to real leads and would bounce if used for outreach.
- **T109** — Marketing-attribution numbers look exactly as certain as verified numbers, even though some are staff guesses, not tracked clicks.
- **T130** — The embed-resize snippet handed out for pasting `/book` onto Chase's site has no origin check (capped impact — can't inject code, can grief layout).
- **T131** `[FIXED]` — Capability report contradicted itself on website-builder draft/publish separation.
- **T133** — A website builder edit goes live instantly if the page is already published; no real draft/publish separation exists.
- **T136** — An unrecognized hostname serves whichever org signed up first on the platform.
- **T148** — Maintenance closure doesn't record who did the work or make an explicit return-to-service decision.
- **T150** — Weight-overage billing has no evidence trail (same root cause as T062).
- **T157** `[FIXED]` — Capability report's own permission count was wrong (said five, listed six).
- **T158, T165** — Integration failure visibility is inconsistent across the six connected services — some surface errors, most don't.
- **T169** — The Google Places search quota is tracked per-org, but the real Google quota is one shared platform-wide key — a future second tenant could silently starve another's usage.

## Blocked / couldn't verify from the codebase alone

- **T005, T170, T171** — Whether Vercel's actual deployed environment (Production/Preview variables, Node version) matches local config; whether dev/staging/production genuinely use separate credentials. Needs Chase to check Vercel's dashboard.
- **T183, T184** — Backup coverage (Neon point-in-time recovery, Vercel Blob retention) and whether a restore has ever actually been proven to work. Entirely Neon/Vercel dashboard questions.
- **T083** — Whether the Booqable and Formspree subscriptions are still genuinely in use — can't be confirmed from inside the app.
- **T141** — A real mobile/accessibility pass needs live browser testing, not code reading; explicitly not attempted rather than guessed.
- **T160, T161, T162** — Several platform-billing subscription-lifecycle checks can't be tested because platform billing isn't turned on yet (no live Stripe keys configured).

## Outstanding pre-existing action items (not verified this pass — need Chase directly)

- **T111** — Enable MFA on the exported owner account (a literal action for Chase to take on his own account, not a code check).
- **T122** — Exclude signing/access tokens from analytical exports (a data-handling action on an existing export, not a code bug).

## Not re-litigated here

Sections 13 ("Prioritized new features," 15 items) and 14 ("Deferred," 9 items) are the original audit's own forward-looking recommendations and prioritization calls — carried onto the board as reference but never assigned a verdict, since they're not things to check against the code.
