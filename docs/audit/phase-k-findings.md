# Phase K Findings — Platform Plans, Subscriptions & Integrations

Run 2026-09-16. Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T157–T169); this is the durable, in-repo summary.

## Fixed during this pass

**T157 — the capability report's own permission count was wrong.** It said "five granular grants" while listing all six by name (invoices, deleting records, expenses, reports, leads, time). Confirmed six in the actual code (`src/lib/session.ts`) and corrected both copies of the report.

## Real gaps found, not fixed

- **T169 — the Google Places search quota is tracked per-org, but the real quota is platform-wide.** The in-app "X of 1,000 used this month" counter is correctly scoped per organization — but `searchPlaces` calls Google through one single shared `GOOGLE_MAPS_API_KEY`. Google's actual 1,000/month free tier applies to that one key across every tenant combined. With only Mobi as a real tenant this doesn't matter yet, but the moment a second paying org exists, one tenant's heavy usage could silently exhaust the real shared quota while every other tenant's own counter still reads well under 1,000 — their searches would just start coming back empty with nothing pointing at why.
- **T158, T165 — integration failure visibility is inconsistent, not uniform.** Google Ads sync genuinely does the right thing: a failure gets written to `GoogleAdsConnection.lastSyncError`, which Settings displays. But `GoogleBusinessProfileConnection` and `TwilioConnection` have no equivalent field at all, and QuickBooks sync failures (confirmed in Phase G) are only logged to the server console. An expired Twilio or Google Business credential would fail silently with nothing in Settings explaining why.

## Confirmed OK

- **T159** — every plan-gated feature encountered across this entire audit went through `hasPlan()`/`requirePlanFor()`, no exceptions found.
- **T163** — the platform-billing webhook's idempotency table (already known-good) prevents a redelivered Stripe event from double-applying an entitlement.
- **T166** — no integration's outage was found to roll back a completed local transaction, even where T158/T165 found the failure wasn't *visible*. The two concerns are separate, and this half held up.
- **T168** — all 8 cron schedules run at distinct hours with no overlap possible.

## Not yet applicable (platform billing isn't live)

- **T160, T161** — no live subscription downgrade/cancellation/payment-failure event exists yet to observe (no Stripe keys configured for platform billing). By inspection, a plan downgrade today only affects feature gating, never touches customer data — worth re-confirming once billing actually turns on.
- **T162** — already honestly disclosed on the Roadmap as still-ahead work: one-time purchase entitlement isn't yet modeled separately from the recurring plan gate.

## Not built (Create-type, deferred to your prioritization)

T164 (one consolidated integration-health screen — today each integration's status lives on its own Settings tab, and per T158 what's tracked isn't even consistent across them), T167 (durable per-execution job records for cron/integration work — today a connection's `lastSyncError` only shows the latest failure, not a history).
