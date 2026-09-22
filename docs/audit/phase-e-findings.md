# Phase E Findings — Pricing, Quotes & Agreements

Run 2026-09-16. Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T045–T062); this is the durable, in-repo summary.

## Fixed during this pass

**T058 — promo code over-redemption race (P1, live-reproducible).** Same shape of bug as the double-booking race fixed in Phase B: `validatePromoCode`'s redemption-cap check and `recordPromoCodeRedemption`'s increment were separated by unrelated work in between, with no transaction. Reproduced live on the Acme org: a max-1-use code fired twice concurrently, both succeeded, final count went to 2. Fixed using the same already-approved pattern — the cap re-check and increment now happen inside the same Serializable transaction as booking creation in `src/app/book/actions.ts`. Re-verified live: exactly one of two concurrent redemptions succeeds. The internal/staff booking-creation action (`src/app/(internal)/bookings/actions.ts`) still calls the old unprotected path and shares the same theoretical race — not fixed here (lower-risk, staff-facing, not public self-serve), noted for awareness.

## Real gap found, not fixed

- **T054 — timezone/date parsing bug.** `startDate`/`endDate` in `submitBookingRequest` are built as `new Date(\`${startDateStr}T${deliveryTime}\`)` with no "Z" suffix or explicit offset. A bare datetime string like this parses as local time in whatever timezone the server process runs in — not necessarily Georgia's. If the deployed server runs in UTC (typical for Vercel), a customer picking "9:00 AM" delivery would actually be stored several hours off from what they selected, and for an early-morning time this could shift the stored date to the previous calendar day.
- **T061 — signed agreement text is editable after signing.** `updateSignedAgreement` (`src/app/(internal)/agreements/actions.ts`) is a real, callable staff action that overwrites `agreementText`/`agreementTitle` on an existing `SignedAgreement` row. It's org-scoped, but nothing distinguishes "fix a typo" from "change what the customer actually agreed to." Contradicts the immutability the capability report described.
- **T046/T048 — Utility Trailer's agreement promises aren't backed by configuration.** Section 2.9 of the service agreement explicitly promises a refundable deposit and a $20/hour late fee for trailer rentals, but the Utility Trailer category has `securityDepositAmount: null` and `overageDayRate: null` — neither charge has any mechanism to actually apply; both would be entirely manual today.
- **T047 — bundle tonnage allowance isn't documented to customers.** The 40-yard two-container bundle correctly doubles its tonnage allowance to 4 tons in configuration, but the agreement text only ever states the generic "first 2 tons" rule and never calls out the bundle case — a customer reading the agreement could reasonably expect only 2 tons.
- **T055 — soft inconsistency in mileage conventions.** The programmatic Material Delivery mileage fee is confirmed genuinely one-way. Separately, `BookingItem.actualMileage` (used for per-category overage billing) is free-typed by staff at return time with no UI indication of whether it should be one-way or round-trip.

## Confirmed OK

- **T049** — Material Delivery's hardcoded fee constants ($100 minimum, 30mi radius, $3.50/mi overage, 20yd/10ton custom-quote thresholds) match the signed agreement's Section 2.8 numbers exactly.
- **T052** — invoices snapshot their pricing at creation time (`createDraftInvoiceForBooking` persists computed line items once; nothing recomputes from live category settings later).
- **T053** — "Call for pricing" is driven by genuinely-null price data, not a UI label disconnected from the underlying model.
- **T056** — tonnage overage billing doesn't round down; a 0.3-ton overage bills as 0.3× rate, not truncated to zero.
- **T057** — surcharge is applied before the promo discount, matching what a customer would expect (the discount reduces the already-surcharged price).

## Needs your input (not a code bug)

- **T045** — the 40-yard bundle's 24hr/48hr tiers are priced `null` (call-for-pricing); 3-day and 7-day are priced. Likely intentional but worth confirming.
- **T059** — `acceptQuote` does guard against re-accepting an already-responded quote, but like T058 before its fix, it's a plain check-then-act with no transaction. Lower real-world likelihood than the booking/promo races (one customer accepting their own quote, not many strangers racing for shared inventory) — flagged as a judgment call rather than live-tested and fixed.

## Not built (Create-type, deferred to your prioritization)

T050 (one shared pricing engine — pricing logic is genuinely duplicated across checkout, invoicing, and quotes today, and happens to agree, but nothing guarantees it stays in sync), T051 (staff-facing pricing breakdown before an invoice exists), T060 (quote versioning/expiration/change-approval), T062 (attaching evidence like scale-ticket photos to the numbers that drive overage billing).
