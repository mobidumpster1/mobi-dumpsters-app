# Phase H Findings — Customers, Leads & Communications

Run 2026-09-16. Read-only pass against Mobi's real live data plus code reading. Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T096–T110); this is the durable, in-repo summary.

## Real data issues found in Mobi's live records — need your input

- **T096 — 72% of real customers have no email or phone.** 39 of 54 customers have neither, almost all from two bulk-import batches. None of them can receive a confirmation, reminder, or marketing send. No queue exists today to work this list down.
- **T097 — a real duplicate candidate.** Two "Chase Vann" customer rows exist — different phone, different email (`cavann100@gmail.com` vs. `chasevann100@icloud.com`), but the same street address just formatted differently. Real evidence, not proof — per the ticket's own caution, this needs your confirmation before any merge (and there's no merge tool yet either — see T099).
- **T098 — two placeholder emails are attached to real leads.** Scanned all 236 leads: found a few phone-number overlaps that look like genuine shared business lines (e.g. three storage locations sharing one central number — probably fine to bulk-message), but also found `user@domain.com` and `example@domain.com` each attached to multiple unrelated leads — Google Places' stand-in for "no public email," now sitting in the data as if it were real. These should be scrubbed before any bulk outreach; sending to them would just bounce.

## Real gaps found, not fixed

- **T109 — marketing attribution overstates its own certainty.** The Marketing page's "Bookings/Revenue from Google Ads" numbers render in the exact same styling as any verified figure elsewhere, with no visual marker that they're inferred. The caption is honest about the UTM-based methodology, but `Customer.leadSource` can also be hand-picked from a dropdown at customer creation — a manually-guessed attribution is counted identically to a directly-tracked one.

## Confirmed OK

- **T102** — `Booking.deliveryAddress` is captured as its own column at checkout, a true snapshot never re-synced from `Customer.address` later.
- **T104** — lead-sequence sends re-check enrollment status, sequence-active, lead status, and opt-out *immediately before every send*, not just at enrollment — and a hard email bounce automatically sets opt-out and stops all active enrollments for that lead, which the same fresh-check logic then honors.
- **T105** — invoice reminders query unpaid status fresh from the database every run and dedupe against a per-org repeat-interval, so a just-paid invoice or a recently-nagged one is correctly skipped.
- **T108** — the Leads page and the standalone Prospecting tool both dedupe into the same `Lead` table via an identical `placeId`-based upsert — re-searching from either one refreshes existing rows instead of duplicating them.

## Not built (Create-type, deferred to your prioritization) — some partially there

- **T106 — a communications timeline UI.** More built than it looks: `EmailDeliveryLog` already captures sent/delivered/bounced/opened/clicked via the Resend webhook — the hard part works. Nothing in the app ever displays it, though; it's currently write-only data.
- **T107** — no staff-visible failure/retry surface; failures today just throw to whoever clicked the button or get swallowed into a result object. Would naturally build on T106's already-collected data.
- **T099** — no customer merge tool (directly relevant to T097's real candidate pair).
- **T100** — no separation between a customer's billing address and their service location(s); one flat `address` field today (per-job addresses are already correctly snapshotted, see T102).
- **T101** — no multiple-contacts-per-customer model for business accounts.
- **T103** — no shared opt-out/suppression concept across tools; Lead opt-out and Customer opt-out are separate today, so a preference set as a Lead doesn't carry forward once they become a Customer.
- **T110** — no preview step before a manual sequence email actually sends.
