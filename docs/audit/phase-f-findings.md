# Phase F Findings — Payments, Invoices, Deposits & Refunds

Run 2026-09-16. No live-data testing this phase (all findings from direct code reading); full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T063–T079); this is the durable, in-repo summary.

## Real gaps found, not fixed

- **T072 — refundable deposits are counted as revenue (P1, live in the numbers today).** `createDraftInvoiceForBooking` folds the "Refundable Security Deposit" line directly into the same `Invoice.amount` as the rental charge, and Reports' `totalRevenue` sums `invoice.amount` wholesale with no filter for `type: "deposit"` lines. Every deposit currently collected is inflating revenue and profit in the P&L, the month-over-month trend, and per-customer totals for as long as it's held — and then incorrectly reads as a revenue *drop* when it's released, rather than a wash. This is a real accounting-accuracy bug, not just a display nitpick.
- **T068 — no idempotency key on card charges.** `chargeCardOnFile`'s `stripe.paymentIntents.create()` call passes no `idempotencyKey`. A client timeout, a double-click before the button disables, or a retried serverless invocation could create two separate PaymentIntents and charge a customer's card twice.
- **T070 — no refund path for a paid installment.** The installment lifecycle (schedule → pay → parent-status sync) is solid, and deleting an already-paid installment is correctly blocked. But `refundInvoicePayment` only reads `Invoice.stripePaymentIntentId`, which is never set for installment-based invoices — only each installment's own field is. The only "undo" today, `markInstallmentUnpaid`, flips the record back to unpaid **without calling Stripe** — the books can end up saying "unpaid" while the money was never actually returned.
- **T066, T067 — rental payment webhook has no dedup table.** Already known from earlier work: the platform-billing webhook has a `ProcessedPlatformWebhookEvent` idempotency table; the customer-payment webhook (`src/app/api/webhooks/stripe/route.ts`) doesn't. In practice the blast radius is smaller than it sounds — `markInvoicePaidViaStripe`/`markInstallmentPaidViaStripe` already no-op once status is "paid" — but a QuickBooks push on a redelivered event isn't guarded the same way and could double-push. Same fix as before: copy the existing pattern.
- **T078 — off-session charge authorization isn't independently retained.** `createSetupIntent` correctly sets `usage: "off_session"`, but neither the SetupIntent's ID nor a confirmation timestamp is ever persisted — `Customer` only keeps the current payment-method reference, overwritten in place with no history. If an off-session charge is disputed, the app has no record of its own to point to.

## Confirmed OK

- **T063, T064** — payments are genuinely modeled with detail (amount, method, provider ID, status, timestamps), whether as fields directly on a single-payment `Invoice` or as full `InvoiceInstallment` rows for a payment plan.
- **T065** — manual and Stripe payments reconcile through the exact same fields and the same QuickBooks push; no divergent path per method.
- **T069** — `status: "paid"` is only ever written after an actual Stripe success (synchronous confirm or webhook), never optimistically.
- **T073** — the partial-refund ceiling is checked in app code (`remaining = amount - alreadyRefunded`, clamped) before Stripe is ever called, not left to Stripe's generic error.
- **T076, T077** — grepped every `db.invoice.update(` call site: `amount` is only ever set at creation or adjusted alongside a real line-item create/delete (damage charges). Nothing lets staff silently retype an invoice's total. (Minor, unfixed note: the damage-report line-item write and the amount update aren't wrapped in one transaction — low risk, left as-is.)
- **T079** — `platformBilling.ts` builds its own Stripe client straight from the platform env vars and never imports anything from `stripe.ts`; fully separate from customer card credentials.

## Not built (Create-type, deferred to your prioritization)

- **T071** — a dedicated deposit ledger view. The underlying fields (`depositAmount`, `depositReleasedAmount`, `depositReleasedAt`, `depositNote`) are already correct; this is a presentation gap, not a data gap.
- **T074** — a refund workflow with reason code, approval step, and dedicated audit view (today: amount + generic audit-log entry, no reason/approval).
- **T075** — a consolidated exception queue for failed charges, unmatched settlements, disputes, and stuck refunds. Today a failed charge just throws a friendly error to whoever clicked the button, with nothing persisted for follow-up.
