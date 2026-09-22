# Phase C Findings — Source Data & Migration

Run 2026-09-16. No code changes this phase — every item here is a data or process question, not a bug. Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T001–T014); this is the durable, in-repo summary.

## Resolved — explained, not bugs

- **T001** — Bookings/BookingItems are empty because historical data was imported directly as Invoice/Expense/Customer records; the business used Booqable as its real booking system historically. Booking is a genuinely new-going-forward feature.
- **T002** — 91 Prisma models minus the 3 deliberately excluded from the export (two pure security-token tables, one internal platform-billing ledger with no org data) = 88 sheets, exactly. Intentional, not a discrepancy.

## Two real financial-data items found in the live records — need your answer

- **T009** — HIST-0004 and HIST-0006 share the *exact* same customer, amount, date, and address. This really does look like a duplicate, not coincidence. Not touched — need your call on which (if either) is wrong.
- **T010** — a real QuickBooks-imported expense dated 2020-03-22, about six years before the rest of your activity in the system. Could be legitimate, could be a bad date in QuickBooks itself carried through as-is. Only checkable against your real QuickBooks records.

## Confirmed as expected

- **T011** — exactly 33 of 79 invoices have no line items, all historical imports with only an address in their notes. Matches the audit's own explanation. Didn't add a "historical summary" label to real invoices without your go-ahead — your call whether that's worth doing.

## Real gaps, not fixed

- **T004** — the data export doesn't preserve column headers on empty tables, just a placeholder.
- **T006** — no field on Invoice tracks whether a record came from the Excel import or was created live.
- **T013** — `deleteInvoice`, `deleteExpense`, and `deleteBooking` are all genuine permanent deletes (not archive/void), gated by a permission and logged. `deleteBooking` at least refuses to run if an invoice exists; `deleteInvoice` has no equivalent check — a fully paid invoice with real payment history can be deleted exactly as easily as an empty draft.

## Not built (Create-type, deferred to your prioritization)

T003 (export manifest), T007 (repeatable import tool with a preview), T008 (idempotent re-import — blocked on T007), T012 (migration reconciliation report), T014 (written retention/deletion policy — worth pairing with a real decision on T013).
