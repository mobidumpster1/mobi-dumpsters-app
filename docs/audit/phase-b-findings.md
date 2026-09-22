# Phase B Findings — Inventory, Availability & Custody

Run 2026-09-16. Full detail on each ticket lives on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T015–T030); this is the durable, in-repo summary.

## Fixed during this pass

**T019, T021, T022 — double-booking race condition (P0, live-reproducible).** `findAvailableItems` (read) and booking creation (write) in `submitBookingRequest` were a plain check-then-act with no transaction. Reproduced live on the Acme org: two concurrent booking requests for the last available unit both succeeded, both reserving the identical physical unit for identical dates. Fixed per Chase's chosen approach — the availability re-check and booking creation now run inside one Postgres **Serializable** transaction; Postgres itself detects the conflict and the app retries once (P2034), then surfaces the existing friendly error. Also fixed a second bug this exposed: the post-creation "mark these units reserved" step was reading the pre-transaction item list instead of what was actually reserved. Re-verified live: exactly one of two concurrent requests now succeeds. Applies equally to bundle bookings and bundle-vs-individual competition (same code path).

**T025, T026 — cancelling a booking never actually freed its dates (P0, real bug, not yet causing damage).** `declineBooking`/`cancelBooking` correctly reset the equipment item's own status field, but *every* availability-checking query in the app (4 separate implementations: `findAvailableItems`, the calendar-widget unavailable-dates calculation, the public API v1 endpoint, and the calendar reschedule-conflict check) read directly off `BookingItem` rows with no awareness of the parent `Booking`'s status at all. A cancelled or declined booking's dates were **permanently blocked, forever** — confirmed live (cancelled a test booking, re-checked availability for the same dates: still zero). Fixed in all four locations. Hasn't damaged Mobi's real data yet only because the real org currently has zero `Booking` rows (historical data came in as Invoices directly) — but would have silently eroded real availability the moment the app started taking real bookings, with nothing in the UI to explain why.

## Confirmed OK

- **T023** — capacity is reserved at booking creation, one clear moment, now also race-safe.
- **T030** — equipment is never hard-deleted through the app; history is preserved by construction (no delete call exists, no cascade rules in the schema).

## Real data issues found in Mobi's live equipment records — need Chase's input, not a code fix

- **T015** — "Junk Removal Crew #1" shows `available`/`Yard`, but its own location-history table has an *open* entry at a real customer address. Which is right?
- **T016** — two items show a blank current location while their own history says "Yard" (probably should just be "Yard"); two others have never logged a location at all.
- **T017** — "Dumpster #1" is internally consistent (status, location, customer all agree) but has no Booking record behind it, so there's no way to see its expected return date from inside the app.
- **T018** — still true: none of the 7 real equipment items has an asset tag set.

## Not built (Create-type, deferred to your prioritization)

- **T024** — expiring reservation holds. Turns out not to matter yet — there's no multi-step checkout-then-pay flow that would create the gap this protects against.
- **T027, T029** — separate resource types (crew/vehicle/equipment) and a custody reconciliation screen. Worth noting: T029 specifically would have caught T015/T016 automatically instead of needing a manual data export to notice.
