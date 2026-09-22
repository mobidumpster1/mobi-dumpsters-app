# Phase G Findings — Expenses, Accounting & Reporting

Run 2026-09-16. Read-only pass against Mobi's real live data (no writes to production, no test-org work needed since nothing here mutates data). Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T080–T095); this is the durable, in-repo summary.

## Real gaps found, not fixed

- **T080 — Reports' default view has no date guard (P1, live today).** Mobi's real `Expense` records span 2020-03-22 to 2026-05-29 (almost 6 years, mostly QuickBooks-imported history); real `Invoice` records span only 2026-02-24 to 2026-09-12 (about 7 months, since the app started tracking bookings). `/reports` applies **no date filter at all** when no range is picked — the very first open of the page compares 7 months of revenue against 6 years of expenses, producing a badly misleading margin number. Pairs directly with T090.
- **T092 — utilization math doesn't distinguish reserved, delivered, or under-maintenance time.** `computeUtilization` treats the whole `[startDate, returnDate)` span as one "on rent" bucket — time before actual delivery counts the same as real on-property time, and a maintenance window mid-rental isn't excluded at all.
- **T093 — a broken QuickBooks sync is invisible.** `pushInvoicePayment` failures are caught and only `console.error`'d by every caller. The local payment stays correctly recorded (the known-good part), but nothing — no flag, no banner, no retry queue — surfaces the failure anywhere in the app. A silent drift between the app and QuickBooks could run for weeks unnoticed.
- **T085 — recurring-bill logging has no dedup guard.** `logRecurringBillAsExpense` creates a freestanding `Expense` with no link back to the `RecurringBill` and no check for an existing entry that period. No double-entries found in Mobi's real data today, but nothing in the code prevents one once QuickBooks imports and manual "log as expense" clicks are both in regular use for the same bill.
- **T082 — two active recurring bills are missing scheduling info.** "Business License" has no amount, due day, or due date at all — nothing to remind on. "Google Ads" has no due day or due date either. ("Capital One" also has `amount: null`, but its own note explains why — working as designed, not a gap.)

## Needs your input (not a code bug)

- **T081 — overlapping expense categories.** "Repairs" (1), "Repairs & maintenance" (15), and "Vehicle expenses:Vehicle repairs" (9) are three separate labels for what looks like the same kind of spend in your real data — your call on how to consolidate.
- **T083 — Booqable/Formspree still current?** Booqable's own note already says "Being replaced by this app," consistent with the sunset plan already underway — worth deactivating once that's final. Formspree has nothing in the data suggesting it's stale; can't verify against a real account from inside the codebase.
- **T087 — financing and asset purchases share a bucket with ordinary expenses.** Vehicle-payment recurring bills and equipment purchases ("Inventory Asset") both land in `totalExpenses` exactly like fuel or repairs once logged — a loan payment and a capital purchase get treated as pure operating cost. Recurring-bill *templates* themselves are correctly kept separate (confirmed no double-count there). Whether to split financing/capex out is an accounting-policy call, likely one for your accountant.

## Confirmed OK

- **T089** — every Reports tab filters by the semantically correct date field (invoices by `issueDate`, expenses by `date`, time entries by `clockIn`, quotes by `createdAt`), not a mix of `createdAt`/`issueDate` by accident. Equipment Utilization deliberately uses the unfiltered array so its own overlap math stays correct — a real design choice, not a bug.
- **T095** — every Reports query is scoped by `organizationId`, no `$allowUnscoped` shortcuts, and the page itself gates on both the `canViewReports` permission and the `team` plan.

## Not built (Create-type, deferred to your prioritization)

T084 (linking a logged expense back to its recurring-bill template — would also fix T085), T086 (an explicit expense-category-to-accounting mapping — would also fix T081), T088 (written definitions for headline metrics), T090 (a coverage-mismatch notice — the natural fix for T080), T091 (a job-cost completion indicator), T094 (a Mobi-vs-QuickBooks reconciliation view — would directly surface T093's silent drift).
