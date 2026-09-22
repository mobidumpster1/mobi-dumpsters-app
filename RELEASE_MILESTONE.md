# First Release Milestone — One Fully Traceable Rental

**Status: not yet started.** This is the gate the audit recommends before building anything else — not a feature, a proof that the core loop the whole business runs on actually holds under real-world conditions. Everything here is scoped tight on purpose: this is not "fix everything in the backlog," it's "make the one thing the business can't function without, provably solid."

Backlog board (live ticket status): **https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd**
Audit instructions (how to verify the Check items referenced below): **AUDIT_INSTRUCTIONS.md**

---

## The milestone, in one sentence

> A customer books available equipment at a reproducible price; dispatch delivers and retrieves it; disposal and adjustments are documented; the invoice reconciles to payments; and all history remains intact — proven under retries, simultaneous bookings, partial completion, and a second tenant.

That sentence has seven clauses. Each one below is a section: what it means concretely, which backlog tickets it depends on, and what "done" looks like.

---

## 1. Book available equipment at a reproducible price

**Means:** what a customer is quoted at checkout is exactly what gets charged — no gap between the number shown and the number billed, and no way to book something that isn't actually available.

**Depends on:**
- T050 — one shared pricing engine (checkout, staff quotes, and invoicing must not each compute price their own way)
- T052 — accepted bookings snapshot their price; never recalculated from today's category settings later
- T139 — server recomputes every dollar figure; a customer-submitted number is never trusted
- T019 — two bookings cannot reserve the same unit for overlapping dates
- T058 — promo code redemption limits hold under concurrent checkouts

**Done when:** a booking created today and re-priced from scratch a month from now (after category prices have changed) shows the *original* price, not the current one — and no sequence of clicks or requests can book equipment that's already spoken for.

## 2. Dispatch delivers and retrieves it

**Means:** the physical handoff — truck goes out, truck comes back — is tracked accurately per item, even when a booking has more than one item and they don't all move together.

**Depends on:**
- T031, T032 — multi-item bookings support independent delivery/return dates and don't falsely complete when only some items are back
- T033 — clicking deliver/return twice can't duplicate the action or its side effects
- T042 — the booking's overall status is always explainable from what's actually happened to its items

**Done when:** a two-item booking where one item comes back on time and the other is picked up three days late shows accurate, independent state for both — and the booking never reads "Completed" until every item genuinely is.

## 3. Disposal and adjustments are documented

**Means:** what happened on the job (weight, extra trips, damage) is captured with evidence, not just a number someone remembers.

**Depends on:**
- T035 — an extra dump applies its charge exactly once, even if the button is pressed more than once
- T149, T150 — disposal ties to a real trip/facility/weight/receipt, and a weight-overage charge can be traced back to that evidence
- T091 — a job-cost completion indicator, so staff can tell at a glance whether disposal/labor/mileage costs are actually all in before closing the job out

**Done when:** every dollar of overage on a closed job's invoice can be traced back to a specific disposal record or damage report — nobody has to take a number's word for it.

## 4. The invoice reconciles to payments

**Means:** money in matches money owed, exactly, with no double-charges and no silent drift between what Stripe says and what Mobi's own records say.

**Depends on:**
- T066, T067 — **confirmed gap, not hypothetical:** the rental-payment webhook (`src/app/api/webhooks/stripe/route.ts`) has no idempotency today. This must be fixed as part of this milestone, not just verified — copy the pattern already built and tested for the platform-billing webhook this project (`ProcessedPlatformWebhookEvent` in `src/app/api/webhooks/stripe-platform/route.ts`).
- T068 — every charge request carries a Stripe idempotency key
- T069 — failed or pending payments never mark an invoice paid early
- T072, T073 — deposits aren't double-counted as revenue; partial refunds can never exceed what was actually collected
- T076 — invoice totals reconcile to lines, adjustments, payments, and refunds, every time
- T077 — a correction to a paid invoice is a new adjustment, never a silent overwrite of the original

**Done when:** for every invoice in a test run, `sum(payments) - sum(refunds) == amount actually owed`, with zero exceptions, including after deliberately retried webhook deliveries and retried charge requests.

## 5. All history remains intact

**Means:** nothing about a real rental — its price, its dates, its signed terms, its payment trail — can quietly change or disappear after the fact.

**Depends on:**
- T013 — cancelled/voided records are archived with a reason, not erased
- T030 — a retired or damaged piece of equipment keeps its full location and rental history
- T061 — a signed agreement's text is locked to what the customer actually agreed to, permanently
- T036, T043 — schedule changes and corrections leave a trail (what changed, who changed it, why) rather than overwriting the original silently

**Done when:** every mutation to a booking, invoice, or agreement after its initial creation is additive (a new row, a new version, a status change with a reason) — grep the codebase for direct `.update()` calls on these models and confirm each one either sets a status/derived field or is itself creating a history row, never blindly replacing financial or legal content.

## 6. Proven under retries, simultaneous bookings, and partial completion

These three are **tests**, not features — see [Section 8](#8-the-four-sign-off-tests) below for the exact scenarios. Nothing in sections 1–5 counts as done until it survives these.

## 7. Proven on a second tenant

**Means:** everything above holds for Mobi Dumpsters *and* for a second, isolated business on the same app — because the whole point of this platform is that it doesn't leak between tenants.

**Depends on:**
- T113, T114, T115, T116, T117, T118, T119 — the full Phase A tenant-isolation check from `AUDIT_INSTRUCTIONS.md`
- T117 — automated isolation tests exist, not just a one-time manual check

**Done when:** the entire golden-path run in Section 8's test plan below is executed twice — once on Mobi Dumpsters LLC, once on the Acme Rentals test org, concurrently if possible — and neither org's data, pricing, or booking state is ever visible from or affected by the other.

---

## 8. The four sign-off tests

These are the actual acceptance criteria. Write each as an automated test (T175 on the backlog — "end-to-end test of the full job lifecycle" — is this section, formalized). Until all four pass, the milestone is not done, regardless of how much of sections 1–5 looks finished by inspection.

### Test A — Retries
Submit the exact same booking request twice in immediate succession (simulating a double-click or a network retry). Send the exact same Stripe webhook event twice. Send a charge request with the same idempotency key twice.
**Pass condition:** exactly one customer, one booking, one charge, one invoice — no duplicates anywhere, on the second attempt of each.

### Test B — Simultaneous bookings
With exactly one unit of a category available, fire two booking requests for overlapping dates at the same moment (a small script issuing both requests in parallel, not sequentially).
**Pass condition:** exactly one succeeds; the other fails cleanly with an "unavailable" error, not a race that double-books the unit or corrupts availability state for a third customer.

### Test C — Partial completion
Create a booking with two items. Delivered both. Return only one. Attempt to invoice the booking, mark it reviewed, and close it out.
**Pass condition:** the booking's derived status reflects "in progress," not "completed"; nothing forces or silently allows closing out a job with equipment still in the field; the invoice (if generated) doesn't include a return-dependent charge (extra mileage, tonnage) for the item that hasn't come back yet.

### Test D — Second tenant
Run Tests A, B, and C in full against the **Acme Rentals (Test Business)** org. Before and after, query both orgs' `Booking`, `Customer`, and `Invoice` tables directly and diff them.
**Pass condition:** zero rows created on the wrong org; zero fields on one org's records referencing the other org's IDs; the real Mobi Dumpsters LLC data is byte-for-byte unchanged by anything that happened on Acme.

---

## Explicitly out of scope for this milestone

To keep this from quietly growing into "fix the whole backlog": the following are real, tracked (see the backlog board), and **not required** to call this milestone done —

- Anything tagged `Feature` on the board (operations exception inbox, pricing simulator, custody reconciliation screen, etc.) — valuable, but additive on top of a solid core, not part of proving the core works.
- Anything tagged `Deferred` (native app, live GPS, more payment processors, etc.).
- P2/P3 items not directly on the booking → dispatch → invoice → payment path (marketing integrations, lead sequences, website builder, maintenance scheduling, customer self-service portal).
- Full coverage of every audit "Check" item — `AUDIT_INSTRUCTIONS.md` is broader than this milestone on purpose; only the tickets cited above are load-bearing for this specific milestone.
- Historical-data cleanup (Section 1 of the audit — the empty Bookings table, the HIST-invoice review, the possible duplicate customers) — real and worth doing, but orthogonal to proving *new* rentals are traceable going forward.

---

## How to track progress

Every T-number cited above already exists on the live backlog board. As each is verified or fixed, update its status there the same way `AUDIT_INSTRUCTIONS.md` describes — this document doesn't duplicate that state, it just defines which subset of the board constitutes "milestone one is done." When every ticket cited in Sections 1–5 is `Done` and all four tests in Section 8 pass twice (Mobi and Acme), this milestone is complete.
