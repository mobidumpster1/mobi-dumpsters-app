# Phase D Findings — Booking & Dispatch Workflows

Run 2026-09-16. Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T031–T044); this is the durable, in-repo summary.

## Fixed during this pass

**T033 — double-click on Deliver/Return sent duplicate customer emails.** Neither `markDelivered` nor `markReturned` guarded against being called twice on the same item. A double-click or a retried form submit would re-send the delivery/pickup notification email to the customer and create a spurious pair of location-history events (close-then-immediately-reopen at the same address). The mileage log entry and draft-invoice creation were already correctly deduped — just these two weren't. Fixed with an early-return guard on each; verified live (second call is now a true no-op, exactly one location event instead of two).

## Confirmed OK

- **T031, T032, T042** — each booking item's delivered/returned state is genuinely independent, `computeBookingStatus` is a clean 9-line function that correctly keeps a booking "In Progress" until every item is back, and it's about as explainable as derived status logic gets.
- **T035** — there's no automated "extra dump charge" mechanism to double-fire in the first place; staff apply that manually through normal edit tools, so this is a process question, not a code one.

## Real gap found, not fixed

- **T038** — assigning a vehicle or driver to a booking is a plain field update with zero conflict checking. Nothing stops the same truck or the same driver from being assigned to two overlapping jobs.

## Not applicable / no target to check

- **T044** — no "force"/"override" mechanism exists anywhere in the booking actions to evaluate. Rules that exist have no bypass; actions with no rule (like T038) have nothing to override.

## Not built (Create-type, deferred to your prioritization)

T034 (dedicated workflows for swaps/extensions/failed delivery/etc.), T036 (schedule-change history), T037 (delivery/pickup time windows instead of a single time), T039 (a consolidated dispatch exception queue — some of this already surfaces piecemeal on the dashboard), T040 (a formal delivery-readiness checklist — the underlying data already exists, just not gathered into one check), T041 (a structured return inspection beyond tonnage/mileage), T043 (a correction workflow for an accidental double-mark — worth pairing with T033's fix, which already prevents the double-mark from having any effect, reducing how urgent this one is).
