# Phase J Findings — Maintenance, Disposal & Field Work

Run 2026-09-16. Full detail on the [live backlog board](https://claude.ai/artifact/11KKoFWnjVYWUQx3G4GzPd) (T145–T156); this is the durable, in-repo summary.

## Real gaps found, not fixed

- **T148 — maintenance closure doesn't record who did it or whether the unit's back in service.** `addMaintenanceEntry`/`updateMaintenanceEntry` do capture repair description, cost, vendor, and a receipt upload — genuinely more than a status flip. But there's no actor field (the acting user is checked for permission, never written to the row) and no explicit return-to-service decision — `MaintenanceLogEntry` isn't tied to `EquipmentItem.status` at all.
- **T150 — weight-overage billing has no evidence trail.** Same root cause as T062 from Phase E: `actualTonnage` is a bare number typed in at return, with nothing — no scale-ticket photo, no receipt — backing the number that directly drives extra-tonnage charges.

## Confirmed OK

- **T154** — mark-delivered/mark-returned and photo upload are fully independent actions; retrying one never re-triggers the other, and the fulfillment actions are already idempotent from this session's Phase D fix. (Minor, lower-severity note: `uploadPhoto` itself has no dedup check, so a retried upload could create two rows for the same photo — not a fulfillment repeat, just a possible duplicate.)
- **T156** — QR-scanned equipment resolves through the scanning user's own session/org, never through the QR code's ID alone — a code from another tenant's equipment resolves to nothing.

## Needs your input / partially built

- **T155** — the Driver view does surface a job's notes clearly, but the precise placement-map pin (the drop-location marker customers set at checkout) only renders on the internal booking detail page, not on the field-facing Driver view where it'd actually help.
- **T152** — photo upload works and is independently retryable, but has no purpose-built "uploading / succeeded / failed, tap to retry" state — it relies on whatever generic feedback the shared upload component already shows.
- **T153** — no offline queue exists anywhere; every driver action requires a live connection. Whether this is worth building depends on how often Mobi's real drivers actually lose signal — a fact only Chase can supply.
- **T145** — the data for a proactive maintenance schedule already exists (`nextServiceDue`, `odometerAtService`) but nothing reads it back into an alert.

## Not built (Create-type, deferred to your prioritization)

T146 (defect reporting that can block an unsafe unit), T147 (per-equipment-type inspection templates), T149 (a real disposal record — today "Dump fee" is just a generic expense category with no trip/facility/weight/receipt structure), T151 (prohibited-material incident tracking, distinct from the existing damage-report flow).
