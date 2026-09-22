# Phase I Findings — Website, Checkout & Customer Experience

Run 2026-09-16. Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T130–T144); this is the durable, in-repo summary.

## Fixed during this pass

**T131 — the capability report contradicted itself, and the wrong half was published.** Section 04 claimed "draft and published content are properly separated," while the report's own Roadmap section said fixing that exact gap was "still ahead." Checked the real schema: `WebsiteBuilderPage` has one `sectionsJson` column and a `published` boolean — there's no separate draft/live copy, so the Roadmap section was right. Corrected both the HTML and the embedded plain-text copy in the [capability report](https://claude.ai/artifact/4JfL9YDh43XdoT2u67kNy5) to state the gap honestly.

## Real gaps found, not fixed

- **T133 — a website builder edit is live the instant it saves.** `togglePublished` only flips a boolean on the same row that holds the page content — there's no separate draft copy. Any autosave while the page is published goes live immediately, with no preview step. (T134's rollback works mechanically via the rolling version history, but inherits this same problem — restoring an old version onto a published page makes it live instantly too.)
- **T136 — an unrecognized hostname serves whichever org signed up first.** Already known from earlier work, confirmed again here: `getPublicOrganizationId` falls back to the oldest-created org when no domain matches. Same family of issue as the cross-tenant invoice leak fixed in Phase A, just for routing instead of a specific lookup.
- **T130 — the embed-resize listener has no origin check.** The copy-paste snippet handed out for embedding `/book` on Chase's own site listens for `postMessage` events with no `event.origin` validation. The impact is capped — it sets `.style.height` directly (a safe, single-property assignment), so this isn't an XSS/CSS-injection path — but an unrelated page could still grief the embedded iframe's layout by posting a fake resize message.

## Needs your input (not a code bug, or a real data-cleanup item)

- **T132 — the unpublished website draft has real rough edges.** Read Mobi's actual saved draft (currently unpublished, so nothing customer-facing yet): two near-duplicate canvas sections, one essentially empty canvas, and a phone number in plain text with no tap-to-call link. Reported only, not touched.
- **T137 — domain management is manual today**, and the capability report already says so honestly: no DNS/SSL automation, no reassignment/removal flow — a domain is pointed at Vercel by hand. Already on the roadmap.
- **T142 — the booking confirmation page is partial.** Shows a reference number and (once an invoice exists) the total with a pay-now option, but never shows the actual booked dates, which service was booked, or any contact information.
- **T143 — no customer self-service portal exists.** Customers only ever reach the app through single-purpose token links (quote, thank-you page, invoice payment) — never a persistent account.
- **T144 — there's no extension/reschedule request feature to validate.** The Check ticket's premise doesn't apply yet; any reschedule today is entirely staff-driven via the Calendar's drag-to-reschedule, which does correctly check for conflicts.
- **T141 — mobile/accessibility wasn't independently verified this pass.** This needs a dedicated live-browser pass (viewport widths, keyboard navigation, contrast, screen-reader labels), not code reading — flagging rather than guessing.

## Confirmed OK

- **T135** — HTML/embed gating runs at save and render time, keyed off a plan value read fresh in the same request, not cached.
- **T138, T139** — checkout shows terms/overages before collecting personal info, and every dollar figure in `submitBookingRequest` is computed server-side; the client never supplies a trusted price.
- **T140** — customer dedup (email then phone) was already solid, and the booking side is now covered as a side effect of Phase B's transaction fix — a resubmitted booking hits the same conflict detection a real race would.

## Not built (Create-type) — see T142, T143 above
