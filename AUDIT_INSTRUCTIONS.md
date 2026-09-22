# Claude Code Audit Instructions — Mobi Platform

**Purpose:** verify the ~100 "Check" items from the September 2026 platform audit against the real codebase, database, and live app behavior. This document is written to be handed to a fresh Claude Code session with no memory of how it was produced — it is self-contained.

Each "Check" item has a ticket ID (T-number) on the live backlog board: **https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd**. Cross-reference every finding back to its T-number.

---

## 0. Before you start

**What this app is:** a multi-tenant Next.js/Prisma/Postgres business-management app for dumpster rental, junk removal, and demolition businesses, in production for a real business (Mobi Dumpsters LLC) with a second isolated test org ("Acme Rentals (Test Business)") that already exists for exactly this kind of testing.

**Read first, for orientation:**
- `AGENTS.md` / `CLAUDE.md` at the repo root — this Next.js version has real API differences from training data; check `node_modules/next/dist/docs/` before assuming behavior.
- `src/lib/tenantGuard.ts` and `src/lib/db.ts` — the multi-tenancy safety net every finding in Phase A should be evaluated against.
- `src/lib/session.ts` — auth, permissions, plan gating, impersonation.

**Ground rules — read these twice:**

1. **This is a Check pass, not a Fix pass.** Your job is to determine, for each item, whether it's `ok` (already handled correctly), an `issue` (a real gap or bug), or `needs_decision` (the code is fine but a business/product decision is genuinely undefined). **Do not fix anything you find** unless a specific finding is trivial, obviously safe, and you flag it clearly as an unplanned fix in your final report — when in doubt, record the finding and leave it for a separate ticket. This keeps the audit's findings auditable against what the code looked like at audit time.
2. **Prefer reading code over running anything.** Most of these are answerable by reading the relevant source file. Only run the app or query the database when a question genuinely can't be answered by reading code (e.g., "does the export contain X" needs a query; "is this function reachable without an org filter" needs reading).
3. **Never touch real Mobi Dumpsters LLC data.** Any live test that creates, modifies, or deletes a record — testing double-booking, testing a webhook, testing an export — must run against the **Acme Rentals (Test Business)** org (`owner@acmerentals-test.com`), never the real org. Clean up any test rows you create (bookings, customers, etc.) when you're done, the same way earlier sessions in this project have.
4. **Never send a real email or SMS to a real customer or lead.** If a check requires triggering a notification, either read the code path without executing it, or execute it against a test customer record on the Acme org with an address you control.
5. **Read-only on the real Mobi database.** `db.$allowUnscoped(...)` and any write against the real org's data requires you to stop and ask first — this document does not pre-authorize it.
6. **Don't push or deploy anything.** This is investigation and reporting only.

**Output format — for every T-number you investigate:**

Update its document on the backlog board with the verdict, using the `ArtifactData` tool:

```
action: "update", url: "https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd",
collection: "tickets", doc_id: "T0XX",
data: {
  status: "Done",              // Done = investigated, regardless of verdict
  verdict: "ok" | "issue" | "needs_decision",
  finding: "<2-4 sentences: what you found, with file:line citations>",
  verifiedAt: "<ISO timestamp>"
}
```

`status: "Done"` means **investigated**, not "no problem found" — the `verdict` field carries the actual outcome. Leave `status: "Open"` if you couldn't reach a conclusion (say why in `finding` and set `verdict: "needs_decision"`).

At the end of each phase, also write a short markdown summary to `docs/audit/phase-<letter>-findings.md` (create the `docs/audit/` folder if it doesn't exist) — one paragraph per T-number, so there's a durable record in the repo alongside the live board.

---

## Known findings — don't re-discover these, just confirm and record

Three items are already answered from earlier work this project and should be quick confirms, not fresh investigations:

- **T066 / T067** (payment webhook double-processing / duplicate handling): **Already confirmed as a real gap.** The platform-billing webhook (`src/app/api/webhooks/stripe-platform/route.ts`) has idempotency — a `ProcessedPlatformWebhookEvent` table checked before processing. The **rental-payment webhook** (`src/app/api/webhooks/stripe/route.ts`, handling real customer payments) has **no equivalent** — confirmed by direct code reading, not yet fixed. Record `verdict: "issue"` for both, citing this file, and note the platform-billing webhook as the reference pattern to copy.
- **T131 / T133 / T134** (draft/publish separation on the Website Builder): **Already scoped, not yet fixed.** `WebsiteBuilderPage` has a single `sectionsJson` field and a `published: Boolean` — publishing just flips the flag, nothing is copied, so an in-progress edit is live the moment `published` is true. This is Phase 2, Defect 1 of an in-progress separate project ("Website Builder as a paid add-on") — confirm the code still matches this description, record `verdict: "issue"`, and note in `finding` that a fix is already planned rather than open-ended.
- **T136** (unknown hostnames serve the wrong tenant): **Already scoped, not yet fixed.** `getPublicOrganizationId()` in `src/lib/session.ts` falls back to `db.organization.findFirstOrThrow({ orderBy: { createdAt: "asc" } })` — whichever org was created first — when no `publicDomain` matches the request's Host header. This is Phase 2, Defect 2 of the same in-progress project. Confirm and record `verdict: "issue"`, same note.

---

## Phase A — Security & tenant isolation (P0, Section 8)

The highest-stakes phase. Budget the most time here.

- **T113** Every access path enforces tenant, including child tables. Grep every `db.<model>.findUnique(` and `findUniqueOrThrow(` call across `src/` (these are structurally exempt from the `tenantGuard` extension — see the comment in `tenantGuard.ts` explaining why). For each one on a model that holds business data, trace backward: was the `id` it's looking up already verified against `user.effectiveOrganizationId` earlier in the same function (e.g., fetched via a scoped `findFirst` first, or is it a nested lookup off an already-scoped parent)? **A prior audit of this exact pattern already found and fixed one real cross-tenant bug** (an unscoped booking-edit lookup) — treat this as a known-risky pattern, not a formality.
- **T114** Cross-tenant references via supplied IDs. Check every server action that accepts a foreign-key-shaped ID from form input (`customerId`, `equipmentItemId`, `vehicleId`, `categoryId`, etc.) — does it re-verify that ID belongs to the caller's org before using it (e.g., `db.customer.findFirst({ where: { id, organizationId } })`), or does it trust the ID and only scope the *write*?
- **T115** Bulk ops, raw queries, exports, webhooks. Grep for `$queryRaw`, `$executeRaw`, `updateMany`, `deleteMany`, and every route under `src/app/api/`. For each, confirm an org filter is present (updateMany/deleteMany on a guarded model are already enforced by `tenantGuard.ts` at runtime — confirm this by testing that an unscoped one actually throws, e.g. in a disposable script against the Acme org). Cron routes under `src/app/api/cron/` are expected to loop per-organization — confirm they actually do, not that they process cross-org in one unscoped call.
- **T116** Real database-level protections. Read `prisma/schema.prisma`'s datasource config and check the actual Postgres role the app connects as (via `DATABASE_URL`) — does it have row-level security policies, or is tenant isolation enforced *only* at the application layer (`tenantGuard.ts`)? State plainly which is true; this determines the actual blast radius if `tenantGuard.ts` itself has a bug.
- **T117** Automated isolation tests. Do any exist today (`grep -r "describe\|test(" ` for test files touching tenancy)? If none exist, `verdict: "issue"` and note the target framework/pattern the project uses (check `package.json` for a test runner first — there may not be one configured yet, which is itself a finding for T174).
- **T118** Staff permissions enforced server-side. For each of the five granular staff permissions (`canManageInvoices`, `canDeleteRecords`, `canManageExpenses`, `canViewReports`, `canManageLeads`) plus `canManageTime`, grep `requirePermission(` and confirm every sensitive action that should require it actually calls it — not just the page-level gate, but the server action itself (a hidden button is not a security boundary).
- **T119** Driver-only accounts. Read `src/app/(internal)/layout.tsx` (or wherever `isDriverOnly` is enforced) and confirm the redirect is server-side on every internal route, not just a hidden sidebar link. Confirm `/driver` and `/scan/[itemId]` themselves don't leak data beyond the assigned job (check what fields the query for "my jobs" actually selects).
- **T120** Session/auth hardening. Read `src/lib/auth.ts` and `src/app/login/`: login throttling (is there any rate limit on failed attempts?), password reset flow (token expiry, single-use?), session revocation (does deactivating a user actually invalidate their existing session token, or only block future logins?), CSRF (Next.js Server Actions have built-in origin checking — confirm nothing bypasses it with a raw `fetch`-based API route that lacks equivalent protection).
- **T121** Secret storage & rotation. Confirm `twoFactorSecret`/`twoFactorBackupCodes` are stored appropriately (backup codes should be hashed, not plaintext — check `src/app/account/actions.ts` or wherever 2FA enrollment lives). API keys (`ApiKey.keyHash`) — confirm it's actually a hash, not a reversible encoding. No rotation mechanism existing at all is a valid `needs_decision` finding, not necessarily `issue`.
- **T122** *(Fix, not Check — but flagged here because this review found it is **not actually done**.)* The full database export (`Mobi Dumpsters - Full Data Export.xlsx`, generated earlier this project) redacted credential fields (password hash, OAuth tokens, Stripe secret keys) but did **not** redact `Quote.publicToken` or `DemolitionAgreement.publicToken` — both are plain bearer tokens (per the schema's own comment, "like the Stripe Checkout... link") that let anyone holding them view/accept a quote or view/sign a demolition agreement with no login. At export time, `Quotes` was empty (0 rows) but `DemolitionAgreements` had 1 row, so that export file currently contains one live, valid bearer token. The file is local-only (never uploaded/shared), so the practical exposure is low, but: (a) don't share that export file with anyone until it's regenerated with `publicToken` added to the redaction list, and (b) add it to the redaction convention for any future export.
- **T123** Public links (booking self-service, quote acceptance `/quote/[token]`, agreement signing, demolition agreement signing). For each token type: how is the token generated (cryptographically random? guessable?), does it expire, can it be revoked, can it be reused after the action it authorizes is complete (e.g., can a quote's accept link be replayed after acceptance)?
- **T124** Private documents/photos. Confirm Vercel Blob URLs for customer photos/documents aren't just "unguessable" (security through obscurity) when they should require a session — check whether blob URLs are public-by-default and whether that's acceptable given what's stored there (read `src/app/api/blob-upload/route.ts`'s `onBeforeGenerateToken` for the access model).
- **T125** Upload validation. Confirm size/type validation in `onBeforeGenerateToken` (already known: video gets a tighter size cap and `video/*` restriction — confirm equivalent restrictions exist for every other upload category, not just video).
- **T126** Lead enrichment SSRF. **Already substantiated by this review, not a fresh lookup:** the code is `enrichFromWebsite()` in `src/lib/leadEnrichment.ts` (not `leads/actions.ts` — confirmed by direct grep). It **does** validate the scheme (`url.protocol !== "http:" && "https:"` → reject), which blocks `file://`/`gopher://`-class tricks. It does **not** validate the resolved host against private/internal IP ranges (`127.0.0.1`, `169.254.169.254` — the cloud metadata endpoint, `10.x`/`172.16-31.x`/`192.168.x`) — a lead's `website` field pointing at any of those would be fetched as-is. It also sets `redirect: "follow"` with no re-validation of the redirect target, so even a URL that passes the initial check could redirect server-side to an internal address. **Record `verdict: "issue"`** — this one doesn't need further investigation, just the fix (reject on redirect, or resolve+check the IP before fetching, or use a small allowlist/DNS-rebinding-safe fetch wrapper).
- **T127** Impersonation logging. Read `src/app/(internal)/platform-admin/actions.ts`'s `startImpersonation`/`stopImpersonation` and the `logAction` calls — confirm the log entry captures both the real admin's identity *and* the target org, not just one.
- **T128** Security alerts. Do any exist (failed-login alerting, credential-change notification, export-triggered alerts)? Likely `verdict: "issue"` (Create) unless something already exists — confirm either way.
- **T129** Logs avoid secrets. Grep `console.log`/`console.error` across `src/` for anything logging a full request body, password, token, or payment detail. Pay particular attention to webhook handlers and the QuickBooks/Stripe/Google OAuth flows.

---

## Phase B — Inventory, availability & custody (P0, Section 2)

- **T019, T020, T021, T022, T028** Booking concurrency. Read `src/lib/availability.ts`'s `findAvailableItems`/`requiredQuantity`. Is unit selection + reservation wrapped in a database transaction (`prisma.$transaction`) with appropriate isolation, or is there a check-then-act race window between "find an available item" and "create the booking"? Write a disposable script (against the **Acme** org) that fires two near-simultaneous booking-creation calls for the same category/dates and confirms only one succeeds when only one unit exists. For bundles (`bundleOfCategoryId`), confirm both underlying units are reserved atomically, not as two separate near-simultaneous operations.
- **T023, T025, T026** When capacity is actually reserved, and hold release. Read `src/app/book/actions.ts`'s `submitBookingRequest` — capacity appears to be reserved at booking *creation* (no separate "hold" concept exists today). Confirm this is actually true (grep for anything resembling a hold/reservation-expiry model) and record it as a `finding` either way — if no hold concept exists, T024 (create expiring holds) is the corresponding forward-looking ticket, and T025/T026 may be `needs_decision` rather than `issue` if there's genuinely no hold to release.
- **T030** Retired/sold/lost/damaged assets keep history. Confirm `EquipmentItem` status changes (`status` field transitions) never delete `EquipmentLocationEvent` or `DamageReport` rows — check the retire/delete action in `src/app/(internal)/equipment/`.

---

## Phase C — Source data & migration (P0, Section 1)

Most of this phase is about the *export/import process* itself, not app code — lighter on file-reading, heavier on reasoning about the process used.

- **T005** Read how the export script (or its replacement, if rebuilt per T003/T007) queries the database — does every `db.<model>.findMany` call happen within one transaction/snapshot, or as N sequential queries where a write could land between them? For a business this size, sequential queries are likely fine in practice — record the actual behavior and let the business decide if it matters (`needs_decision` unless a real gap is found).
- **T006** Do imported historical records (the `HIST-####` invoices, etc.) carry any field identifying they came from the Excel import vs. the live app? Check `Invoice.notes` or look for a dedicated source field — if none exists today, that's the T006 finding.
- **T008** Idempotent re-import. If a repeatable import script/tool doesn't exist yet (per T007's "Create"), this is `needs_decision`/blocked-on-T007 rather than a standalone check — note the dependency.
- **T013** Confirm `Invoice`, `Booking`, `Expense` deletion actions actually soft-delete/void/cancel rather than hard-delete — grep for `.delete(` vs a `status` update on these models' action files.

---

## Phase D — Booking & dispatch workflows (P1, Section 3)

- **T031, T032** Read `BookingItem`'s fields and the delivered/returned marking actions (`markDelivered`/`markReturned` in `src/app/(internal)/bookings/actions.ts`) — confirm each item's state is independent and that `computeBookingStatus` (wherever it lives) correctly derives "in progress" rather than "completed" when only some items are returned.
- **T033** Idempotent deliver/return. Does clicking "Mark Delivered" twice in a row (e.g., a double-click or a retried form submit) create a duplicate side effect (duplicate mileage log entry, duplicate notification email)? Read the action; if it just sets `deliveredAt` unconditionally, a second call is likely a no-op in effect (already-set timestamp gets overwritten with a new one, but nothing duplicates) — confirm and record precisely what does/doesn't duplicate.
- **T035** Extra-dump charge exactly once. Find the "extra dump" / dump-and-return flow (likely in `src/app/(internal)/bookings/actions.ts` near service requests) and confirm the reset/charge can't be triggered twice for the same event.
- **T038** Driver/vehicle double-assignment. Is there any validation preventing the same driver or vehicle from being assigned to two overlapping jobs, or is assignment purely advisory (a label with no conflict check)? Record the actual behavior.
- **T042** Derived status explainability. Read `computeBookingStatus` and confirm its logic is simple enough to be genuinely explainable (a short, readable function) rather than needing to reverse-engineer — this one is more of a code-quality read than a bug hunt.
- **T044** Staff overrides. For any action that lets staff bypass a normal rule (e.g., manually marking something delivered out of order, force-cancelling with an invoice attached), confirm a reason field and permission check exist — if none do today, `verdict: "issue"`.

---

## Phase E — Pricing, quotes & agreements (P1, Section 4)

- **T045, T046, T047, T048, T049** These are primarily **data-review items against the live database**, not code — pull the actual `EquipmentCategory`/`PricingTier` rows for the two 40-yard short-duration tiers, the bundle category, the trailer category, and the Material Delivery category, and compare their configured values against `Service Agreement` text (`ServiceAgreementSettings` row) and against `src/lib/materialDelivery.ts`'s hardcoded constants. Report the actual numbers found on both sides so Chase can reconcile them — this phase is about surfacing the discrepancy clearly, not resolving it (that's a business decision).
- **T052** Price snapshotting. Confirm `BookingItem.price` is captured once at booking creation and never recalculated from `EquipmentCategory.basePrice` later — this was already confirmed true for *invoicing* (`computeInvoiceLineItems` deliberately uses `item.price`, per its own code comment) — just confirm the same holds for any other place a price might be redisplayed (booking detail page, reports).
- **T053** "Starting at" vs fixed vs quote-required. Read `priceLabel()` in `src/app/book/categoryPricing.ts` — confirm the distinction is real in the data model (e.g., a null `basePrice` genuinely means "call for pricing") and that the public UI never implies a firm price when one wasn't actually set.
- **T054** Rental-day boundaries & timezone. Grep date math in `src/app/book/actions.ts` and `src/lib/date.ts` for raw `Date` arithmetic vs. explicit UTC handling — confirm a booking made near midnight, or spanning a DST transition, computes the expected number of rental days.
- **T055** Mileage basis. Read `src/lib/materialDelivery.ts` and `src/app/book/actions.ts`'s `oneWayMiles` computation — confirm the naming is honest: it's explicitly one-way today (the variable name says so), never doubled for a round trip. Confirm every place a mileage fee is charged (Material Delivery's hardcoded rule, and any per-category `overageMileageRate` usage from `invoicing.ts`) uses the same one-way convention — a mismatch between "one-way" in one place and "round-trip" in another would silently over- or under-charge.
- **T056** Tonnage units & rounding. Read `computeInvoiceLineItems` in `src/lib/invoicing.ts` for the tonnage-overage block — confirm `actualTonnage` and `includedTonnage` are compared in the same unit (both should be short tons, given the business is US-based) and that the extra-tons calculation doesn't silently floor/round in a way that undercharges (e.g., `Math.max(0, ...)` alone doesn't round — confirm nothing downstream truncates decimal tons before billing).
- **T057** Discount/surcharge stacking order. Read `submitBookingRequest`'s pricing block again — confirm the actual order (seasonal adjustment, then promo discount, per the code's own structure) matches what staff/customers would expect, and that it's documented somewhere a future change won't silently reorder it.
- **T058** Promo redemption limits under concurrency. Similar to T019 — is `PromoCode` redemption-count checking-and-incrementing done atomically, or is there a race window where two simultaneous checkouts could both succeed past a "max 1 use" cap? Test against Acme if a real gap looks likely from reading the code first.
- **T059** Quote acceptance idempotency. Read the quote-acceptance public action — does double-submitting the accept form (slow network, double-tap) create two bookings from one quote? Look for a status check (`if (quote.status !== "sent") throw`) guarding the create.
- **T061** Signed terms immutability. Confirm `SignedAgreement` stores the full agreement text at signing time (already known to be true per the capability report) and that no update path exists that could alter it after the fact — grep for any `db.signedAgreement.update(` outside of the initial creation.

---

## Phase F — Payments, invoices, deposits & refunds (P1, Section 5)

- **T063, T064, T065** Read `src/lib/invoicing.ts` and `src/lib/stripe.ts` in full. Confirm payments are modeled as their own thing (installments, `stripePaymentIntentId` on Invoice) rather than `status` being the only record of money movement — specifically, for T064, confirm each payment/installment record actually carries amount, method, provider ID, status, and a timestamp (not just a boolean "paid").
- **T066, T067** *(Already confirmed — see "Known findings" above. Record and move on.)*
- **T068** Charge retry protection. Does `chargeCardOnFile` in `src/lib/stripe.ts` pass an idempotency key to Stripe's API, or could a network retry from the client cause a double charge? Check the actual `stripe.paymentIntents.create()` call for an `idempotencyKey` option.
- **T069** Failed payments don't mark invoices paid early. Read the webhook and the direct-success-path code together — confirm both only ever set `status: "paid"` on an actual `payment_intent.succeeded`/confirmed installment, never optimistically on submission.
- **T070** Installment lifecycle. Read `InvoiceInstallment` handling in `invoicing.ts` (`markInstallmentPaidViaStripe` and neighbors) — confirm partial/cancel/refund paths all exist and update the parent invoice's derived status correctly.
- **T071, T072** Deposit accounting. Read `releaseDeposit` (bookings actions) — confirm a deposit is tracked as its own line/field distinct from rental revenue, and that "release" vs. "refund partial and keep the rest" are both represented.
- **T073** Partial refund ceiling. Read `refundPayment` in `stripe.ts` — its own comment already flags that Stripe's own error is generic rather than invoice-specific; confirm the *caller* (`refundInvoicePayment` or similar) actually checks the running total before calling Stripe, not just after.
- **T076, T077** Invoice reconciliation & correction preservation. Confirm there's no code path that directly overwrites `Invoice.amount` after payment has begun — corrections should read as new line items/adjustments, not silent field edits. Grep for `db.invoice.update(` call sites and categorize each.
- **T078** Off-session charge evidence. Confirm `createSetupIntent`'s `usage: "off_session"` flag (already present per the code) is paired with keeping enough evidence (the setup intent ID, confirmation timestamp) to justify the charge if disputed.
- **T079** Customer vs. platform credentials. Confirm `StripeConnection` (per-org, customer-facing) and the platform billing env vars (`STRIPE_PLATFORM_SECRET_KEY` etc.) are never read from the same code path — grep both `src/lib/stripe.ts` and `src/lib/platformBilling.ts` for any shared helper that could conflate them (they're currently fully separate files; confirm nothing imports across).

---

## Phase G — Expenses, accounting & reporting (P1, Section 6)

- **T085** Recurring bills vs. QuickBooks-imported expenses. Compare `RecurringBill` records against `Expense` records with a QuickBooks source tag (if one exists) for the same vendor/amount/date — look for the specific overlaps the audit flagged in the export.
- **T087** Reporting treatment of financing/deposits. Read the Reports P&L/Cash Flow tab's query logic (`src/app/(internal)/reports/page.tsx`) — confirm `RecurringBill` payments (financing) aren't counted as ordinary operating expense in a way that misrepresents margin.
- **T089** Report date-filter correctness. For each Reports tab, confirm the date filter is applied to the semantically correct date field (e.g., Revenue should filter by booking/delivery date or invoice issue date, consistently — not accidentally by `createdAt` for one tab and `issueDate` for another).
- **T092** Utilization math. Read the Equipment utilization report query — confirm it distinguishes "available," "reserved," "out on rental," and "in maintenance" rather than collapsing reserved-but-not-yet-delivered into the same bucket as idle.
- **T093** QuickBooks sync resilience. Read `src/lib/quickbooks.ts`'s `pushInvoicePayment` — confirm the existing "a sync hiccup doesn't undo the local payment" behavior (already known) is paired with the failure actually being *visible* somewhere (a flag, a log, a retry queue) rather than just swallowed.
- **T095** Reports respect tenant/permission scoping. Confirm every Reports query includes `organizationId` (should already be guaranteed by `tenantGuard.ts` for guarded models — confirm Reports doesn't route around it via `$allowUnscoped` for convenience) and that the page itself is gated by the right permission (`canViewReports`).

---

## Phase H — Customers, leads & communications (P2, Section 7)

- **T102** Address edits vs. historical job locations. Confirm `Booking.deliveryAddress` is copied at booking time (a snapshot) rather than a live reference to `Customer.address` — check the `Booking` schema and creation code.
- **T104, T105** Automation stop conditions & reminder dedup. Read the lead-sequence enrollment logic and the invoice/delivery reminder cron jobs — confirm each checks current state (unsubscribed, replied, already paid) immediately before sending, not just at enrollment time.
- **T108** Leads/Prospecting shared dedup. Confirm both features write to the same `Lead` table (already known) and that whatever duplicate-prevention exists for Google Places re-searches (matching by place ID or address) applies uniformly regardless of which tool triggered the search.
- **T109** Marketing attribution labeling. Confirm the Marketing dashboard UI doesn't present UTM-inferred attribution with the same visual confidence as a directly-verified one (e.g., referral cookie match).

---

## Phase I — Website, checkout & customer experience (P2, Section 9)

- **T130** Iframe-resize snippet validation. Find the embed snippet / resize-listener code — confirm the receiving `message` event handler checks `event.origin` against an expected value and sanitizes the height before applying it (never `eval`s or blindly trusts arbitrary numeric strings from `postMessage`).
- **T132** Clean the unfinished builder draft. This is a live-data cleanup task on the real Mobi org's `WebsiteBuilderPage.sectionsJson` — read it, identify the specific issues named (repeated widgets, empty canvases, incomplete phone link), and report exactly what's there before anyone touches it (don't edit it as part of this Check pass).
- **T135** HTML/embed safety across plan changes. Already confirmed in the capability report that `stripUngatedHtmlBlocks` runs at three points (editor lock, save, and public render) — confirm this is still true by reading `src/lib/websiteSections.ts` and both call sites, and that the render-time check uses a **live** plan lookup (not a stale/cached value).
- **T137** Domain ownership, reassignment, SSL, removal. Already known from earlier discovery this project: `Organization.publicDomain` is a plain, unvalidated text field (`updatePublicDomain()` in `src/app/(internal)/settings/actions.ts` only checks it isn't already claimed by another org) — there is no DNS verification, no SSL provisioning, and no explicit "release/reassign" flow; a domain is pointed at the app by hand in Vercel's own dashboard. Confirm this is still accurate and record `verdict: "needs_decision"` — real, programmatic domain management is already a named future phase (see the Website Builder paid add-on project's Phase 6), not a fresh gap to design here.
- **T141** Mobile/accessibility pass. Load `/book` at a 375px viewport and confirm no horizontal overflow (`document.documentElement.scrollWidth` should equal `window.innerWidth` — this exact check has already been used successfully elsewhere in this project). Tab through the checkout form with a keyboard only and confirm every control is reachable and has a visible focus state. Check that error messages (failed availability, invalid promo code, etc.) are associated with their field, not just a floating banner.
- **T138, T139** Checkout pricing transparency & server authority. Confirm the public booking form never submits a client-computed total that the server trusts — read `submitBookingRequest` and confirm every dollar figure is recomputed server-side from category/tier/material data, never taken from a hidden form field.
- **T140** Submission retry duplication. Does resubmitting the booking form (double-click, back-button-forward) create two customers or two bookings? Check for any idempotency key or existing-customer lookup-by-email/phone before create (already known: it does look up by email then phone first — confirm this prevents the *customer* duplicate; separately check whether the *booking* itself could still duplicate).
- **T144** Extension/reschedule validation. Confirm the customer self-service extension request re-validates availability for the new dates before staff can accept it — or if acceptance is manual/staff-driven today, confirm staff has the tools to see a conflict before approving (this may be `needs_decision` rather than `issue` if the process is intentionally manual).

---

## Phase J — Maintenance, disposal & field work (P2, Section 10)

- **T148** Maintenance closure record completeness. Read the `MaintenanceLogEntry`/`MaintenanceWindow` closure action — confirm it captures repair description, cost, actor, and the return-to-service decision, not just a status flip.
- **T150** Weight-overage traceability. Confirm `actualTonnage` (entered at return) links to any receipt/scale-ticket evidence today, or whether it's just a bare number — likely `verdict: "issue"` pointing at T062 (evidence tracking) as the fix.
- **T154** Reconnect/retry uploads don't duplicate. For mobile photo upload on Driver view, check whether retrying a failed upload could also re-trigger the "mark delivered" action it's bundled with.
- **T156** QR scan tenant/asset resolution. Read `/scan/[itemId]/page.tsx` — confirm the item lookup is scoped to the scanning user's org (a QR code is just a URL with an ID in it; confirm it can't be used to view/act on another org's equipment item by guessing/reusing an ID).

---

## Phase K — Platform plans, subscriptions & integrations (P2, Section 11)

- **T159** Consistent server-side entitlements. Confirm every plan-gated feature goes through `hasPlan`/`requirePlanFor` (per the capability report, ~115 call sites) — spot-check a sample rather than reading all 115; flag any gate that reads `user.plan` or `organization.plan` directly instead of through the shared helper.
- **T160, T161, T162, T163** Subscription lifecycle. These overlap heavily with the in-progress "Website Builder paid add-on" project's own Phase 1/4/5 design (entitlement vs. publishing, grandfathering, webhook idempotency already built for platform billing). Read that project's plan artifact if available, or just confirm current behavior: today, `customer.subscription.deleted` resets `Organization.plan` straight to `"solo"` immediately — no grace period, no suspension state, nothing distinguishing "payment failed, give it 14 days" from "cancelled outright" (that's exactly T161). Record this as the current (pre-Phase-5) behavior, `verdict: "needs_decision"` pointing at the already-planned fix rather than a fresh issue.
- **T165, T166** OAuth failure handling. For each of the six integrations (Stripe, Twilio, QuickBooks, Google Business, Google Ads, Search Console), confirm an expired/revoked token produces a visible error state in Settings rather than a silent no-op, and that a sync failure never rolls back an already-completed local transaction (e.g., a failed QuickBooks push shouldn't un-mark an invoice as paid — already known true for QuickBooks; confirm for the others).
- **T168** Scheduled task overlap. Read `vercel.json`'s 8 cron schedules — confirm no two crons could plausibly run concurrently and duplicate the same business action (e.g., a long-running sync still executing when the next scheduled run fires).
- **T169** Tenant-aware quotas. Confirm the Google Places search quota (1,000/month, shared between Leads and Prospecting) is tracked per-organization, not globally across all tenants on the platform.

---

## Phase L — Engineering, testing, backups & operations (P1, Section 12)

- **T170, T171** Read `package.json`'s exact dependency versions and confirm `.env` values differ between what's used locally vs. what's configured in Vercel's dashboard (you may need to ask Chase to confirm the Vercel-side values rather than assuming).
- **T172** Migration review process. Confirm there's a convention for hand-written migrations (this project already writes SQL by hand under `prisma/migrations/<name>/migration.sql` rather than relying solely on `prisma migrate dev` — confirm this is documented somewhere, e.g. in `CLAUDE.md`/`AGENTS.md`).
- **T174, T175** Automated test coverage. Check `package.json` for a test runner and `find . -name "*.test.ts"` — if genuinely none exist, this is the single biggest `verdict: "issue"` of the whole audit, and worth calling out prominently in the final report rather than burying it in the list.
- **T178** Timezone/DST test coverage. Distinct from T054 (whether the *logic* handles timezones correctly) — this is about whether any *test* exercises it. If T174/T175's answer is "no test runner configured," this is automatically also `issue` for the same reason; if tests do exist, specifically check for a case spanning a DST transition (e.g., a booking crossing the March or November change-over) and one for a rental that starts/ends near UTC midnight.
- **T176, T177** Read `prisma/schema.prisma` for `@unique`/`@@unique` constraints on the fields that matter (booking overlaps, promo code names, etc.) and grep for how money is typed (`Float` vs `Decimal` — Prisma `Float` for currency is a real, common bug class; confirm what's actually used and whether rounding errors are possible in practice given the amounts involved).
- **T179, T180** Read the Prisma schema for `@@index` declarations on frequently-filtered fields (`organizationId` combined with date ranges especially) and check any list/report page for unbounded `findMany` calls with no `take`/pagination.
- **T183, T184** Backup coverage. This is likely a question for Neon's own dashboard (point-in-time recovery settings) and Vercel Blob's retention — not answerable from the codebase alone; note this explicitly rather than guessing.

---

## Final report

When all phases are done, write one consolidated summary (`docs/audit/SUMMARY.md`) with:
- A count of `ok` / `issue` / `needs_decision` per phase.
- The full list of `issue` verdicts, sorted by priority (P0 first), each with its T-number and one-line finding.
- Anything that blocked investigation (couldn't verify without Vercel/Neon dashboard access, needed a decision only Chase can make, etc.) called out separately so it's not mistaken for "done."

Do not close this document out by fixing anything — hand the findings back for a separate, explicitly-scoped fix pass.
