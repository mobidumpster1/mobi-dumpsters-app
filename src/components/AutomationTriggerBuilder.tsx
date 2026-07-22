"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";

type TriggerEntity = "lead" | "booking" | "invoice" | "quote" | "customer";
type ActionType = "send_email" | "send_sms" | "create_customer_note" | "post_facebook";

const TRIGGER_CATALOG: Record<
  TriggerEntity,
  {
    label: string;
    statusValues: string[] | null;
    conditionFields: { field: string; label: string; type: "string" | "number" }[];
  }
> = {
  lead: {
    label: "Lead",
    statusValues: ["new", "contacted", "interested", "quoted", "not_interested", "customer"],
    conditionFields: [{ field: "source", label: "Lead Source", type: "string" }],
  },
  booking: {
    label: "Booking",
    statusValues: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
    conditionFields: [],
  },
  invoice: {
    label: "Invoice",
    statusValues: ["unpaid", "paid", "partial"],
    conditionFields: [{ field: "amount", label: "Amount", type: "number" }],
  },
  quote: {
    label: "Quote",
    statusValues: ["draft", "sent", "accepted", "declined", "expired"],
    conditionFields: [],
  },
  customer: {
    label: "Customer (newly created)",
    statusValues: null,
    conditionFields: [{ field: "leadSource", label: "Lead Source", type: "string" }],
  },
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  send_email: "Send an email",
  send_sms: "Send a text (SMS)",
  create_customer_note: "Add a customer note",
  post_facebook: "Post to Facebook Page",
};

type InitialValues = {
  name: string;
  triggerEntity: TriggerEntity;
  triggerValue: string | null;
  conditionField: string | null;
  conditionOperator: string | null;
  conditionValue: string | null;
  actionType: ActionType;
  actionSubject: string | null;
  actionBody: string;
  maxPerRun: number;
  maxPerDay: number;
};

// Calls the create/update action directly (not via <form action>) so a
// validation throw shows a friendly inline error instead of crashing to
// Next's generic error page — the established fix for any new form that
// can throw. Several validation paths exist here (missing name, missing
// body), so this is exactly the case that pattern is for.
export function AutomationTriggerBuilder({
  action,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: InitialValues;
  submitLabel: string;
}) {
  const [triggerEntity, setTriggerEntity] = useState<TriggerEntity>(initial?.triggerEntity ?? "lead");
  const [conditionField, setConditionField] = useState(initial?.conditionField ?? "");
  const [actionType, setActionType] = useState<ActionType>(initial?.actionType ?? "send_email");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entityCatalog = TRIGGER_CATALOG[triggerEntity];
  const conditionMeta = entityCatalog.conditionFields.find((c) => c.field === conditionField);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await action(new FormData(e.currentTarget));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that rule.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          className={inputClass}
          placeholder="e.g. Thank interested leads by email"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="When this happens" htmlFor="triggerEntity">
          <select
            id="triggerEntity"
            name="triggerEntity"
            value={triggerEntity}
            onChange={(e) => {
              setTriggerEntity(e.target.value as TriggerEntity);
              setConditionField("");
            }}
            className={inputClass}
          >
            {Object.entries(TRIGGER_CATALOG).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </Field>

        {entityCatalog.statusValues ? (
          <Field label="Status becomes" htmlFor="triggerValue">
            <select id="triggerValue" name="triggerValue" defaultValue={initial?.triggerValue ?? ""} className={inputClass}>
              <option value="">Any status</option>
              {entityCatalog.statusValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="flex items-end pb-4 text-sm text-zinc-500">
            Fires once for every newly created customer.
          </div>
        )}
      </div>

      {entityCatalog.conditionFields.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="And also (optional)" htmlFor="conditionField">
            <select
              id="conditionField"
              name="conditionField"
              value={conditionField}
              onChange={(e) => setConditionField(e.target.value)}
              className={inputClass}
            >
              <option value="">No extra condition</option>
              {entityCatalog.conditionFields.map((c) => (
                <option key={c.field} value={c.field}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Comparison" htmlFor="conditionOperator">
            <select
              id="conditionOperator"
              name="conditionOperator"
              defaultValue={initial?.conditionOperator ?? "equals"}
              disabled={!conditionField}
              className={`${inputClass} disabled:bg-zinc-100 disabled:text-zinc-400`}
            >
              <option value="equals">equals</option>
              <option value="not_equals">doesn&apos;t equal</option>
              {conditionMeta?.type === "number" && (
                <>
                  <option value="greater_than">greater than</option>
                  <option value="less_than">less than</option>
                </>
              )}
            </select>
          </Field>
          <Field label="Value" htmlFor="conditionValue">
            <input
              id="conditionValue"
              name="conditionValue"
              defaultValue={initial?.conditionValue ?? ""}
              disabled={!conditionField}
              className={`${inputClass} disabled:bg-zinc-100 disabled:text-zinc-400`}
              placeholder={conditionMeta?.type === "number" ? "e.g. 500" : "e.g. referral"}
            />
          </Field>
        </div>
      )}

      <Field label="Then do this" htmlFor="actionType">
        <select
          id="actionType"
          name="actionType"
          value={actionType}
          onChange={(e) => setActionType(e.target.value as ActionType)}
          className={inputClass}
        >
          {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      {actionType === "send_email" && (
        <Field label="Email Subject" htmlFor="actionSubject">
          <input
            id="actionSubject"
            name="actionSubject"
            defaultValue={initial?.actionSubject ?? ""}
            className={inputClass}
            placeholder="e.g. Thanks for your interest!"
          />
        </Field>
      )}

      <Field
        label={
          actionType === "create_customer_note"
            ? "Note text"
            : actionType === "send_sms"
              ? "Text message"
              : actionType === "post_facebook"
                ? "Facebook post text"
                : "Email body"
        }
        htmlFor="actionBody"
      >
        <textarea
          id="actionBody"
          name="actionBody"
          required
          rows={5}
          defaultValue={initial?.actionBody}
          className={inputClass}
          placeholder="Use {{customerName}} and {{businessName}} to personalize."
        />
      </Field>
      <p className="-mt-2 text-xs text-zinc-500">
        Available variables: <code>{"{{customerName}}"}</code>, <code>{"{{businessName}}"}</code>
      </p>
      {actionType === "post_facebook" && (
        <p className="-mt-2 text-xs text-amber-600">
          This posts publicly to your connected Facebook Page. New rules start disabled —
          check the match preview on this rule&apos;s page and keep Max per run small before
          turning it on.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Max per run" htmlFor="maxPerRun">
          <input
            id="maxPerRun"
            name="maxPerRun"
            type="number"
            min="1"
            defaultValue={initial?.maxPerRun ?? 25}
            className={inputClass}
          />
        </Field>
        <Field label="Max per day" htmlFor="maxPerDay">
          <input
            id="maxPerDay"
            name="maxPerDay"
            type="number"
            min="1"
            defaultValue={initial?.maxPerDay ?? 100}
            className={inputClass}
          />
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
