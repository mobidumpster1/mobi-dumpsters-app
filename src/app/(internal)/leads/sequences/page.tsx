import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission, requireUser } from "@/lib/session";
import { Field, inputClass } from "@/components/Field";
import { ConfirmButton } from "@/components/ConfirmButton";
import { getLeadOutreachSettings } from "@/lib/leadOutreachSettings";
import {
  createSequence,
  toggleSequenceAutoSend,
  toggleSequenceActive,
  deleteSequence,
  addSequenceStep,
  deleteSequenceStep,
  updateDailySendCap,
} from "../sequenceActions";

export const dynamic = "force-dynamic";

export default async function SequencesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "canManageLeads")) redirect("/");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [sequences, templates, outreachSettings, autoSentToday] = await Promise.all([
    db.emailSequence.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { createdAt: "asc" },
      include: {
        steps: { orderBy: { order: "asc" }, include: { template: true } },
        _count: { select: { enrollments: { where: { status: "active" } } } },
      },
    }),
    db.leadEmailTemplate.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
    }),
    getLeadOutreachSettings(user.effectiveOrganizationId),
    db.leadEmailSend.count({
      where: {
        source: "sequence_auto",
        sentAt: { gte: startOfDay },
        lead: { organizationId: user.effectiveOrganizationId },
      },
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Email Sequences</h1>
          <p className="mt-1 text-zinc-500">
            Multi-step outreach built from your Email Templates. Auto-Send sequences email the
            next step by themselves once due; everything else shows up as a follow-up you send
            with one click from the Leads page.
          </p>
        </div>
        <Link
          href="/leads"
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Back to Leads
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-700">Sending Limits</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Caps how many Auto-Send emails go out per day, even if more leads are due — a big batch
          firing all at once looks automated and can hurt your sending domain's reputation.
          Doesn't apply to manual sequences or one-click sends, since a person sending those is
          already self-paced. Checked once a day; if more leads are due than the cap allows, the
          oldest-due ones go out first and the rest wait for tomorrow.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
              autoSentToday >= outreachSettings.dailySendCap
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-zinc-200 bg-zinc-50 text-zinc-600"
            }`}
          >
            {autoSentToday} of {outreachSettings.dailySendCap} Auto-Send emails used today
          </div>
          <form action={updateDailySendCap} className="flex items-end gap-2">
            <Field label="Daily cap" htmlFor="dailySendCap">
              <input
                id="dailySendCap"
                name="dailySendCap"
                type="number"
                min="1"
                step="1"
                defaultValue={outreachSettings.dailySendCap}
                className={`${inputClass} w-24 py-2 text-sm`}
              />
            </Field>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Save
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {sequences.map((sequence) => (
          <div key={sequence.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{sequence.name}</h2>
                <p className="text-xs text-zinc-500">
                  {sequence._count.enrollments} lead{sequence._count.enrollments === 1 ? "" : "s"}{" "}
                  currently enrolled
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={toggleSequenceAutoSend.bind(null, sequence.id, !sequence.autoSend)}>
                  <button
                    type="submit"
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      sequence.autoSend
                        ? "bg-blue-100 text-blue-700"
                        : "border border-zinc-300 text-zinc-600"
                    }`}
                  >
                    {sequence.autoSend ? "Auto-Send: On" : "Auto-Send: Off"}
                  </button>
                </form>
                <form action={toggleSequenceActive.bind(null, sequence.id, !sequence.active)}>
                  <button
                    type="submit"
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      sequence.active
                        ? "bg-green-100 text-green-700"
                        : "border border-zinc-300 text-zinc-600"
                    }`}
                  >
                    {sequence.active ? "Active" : "Paused"}
                  </button>
                </form>
                <form action={deleteSequence.bind(null, sequence.id)}>
                  <ConfirmButton
                    message={`Delete the "${sequence.name}" sequence? Enrolled leads' history goes with it.`}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {sequence.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-zinc-900">Step {step.order}</span>
                    <span className="ml-2 text-zinc-500">
                      {step.order === 1
                        ? step.delayDays === 0
                          ? "sent right away"
                          : `sent ${step.delayDays}d after enrolling`
                        : `sent ${step.delayDays}d after step ${step.order - 1}`}
                    </span>
                    <span className="ml-2 text-zinc-700">— {step.template.name}</span>
                  </div>
                  <form action={deleteSequenceStep.bind(null, step.id)}>
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </form>
                </div>
              ))}
              {sequence.steps.length === 0 && (
                <p className="text-sm text-zinc-400">No steps yet — add one below.</p>
              )}
            </div>

            {templates.length > 0 ? (
              <form
                action={addSequenceStep.bind(null, sequence.id)}
                className="mt-3 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3"
              >
                <Field label="Template" htmlFor={`template-${sequence.id}`}>
                  <select
                    id={`template-${sequence.id}`}
                    name="templateId"
                    required
                    className={`${inputClass} py-2 text-sm`}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Days after previous step" htmlFor={`delay-${sequence.id}`}>
                  <input
                    id={`delay-${sequence.id}`}
                    name="delayDays"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue="3"
                    className={`${inputClass} py-2 text-sm`}
                  />
                </Field>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  + Add Step
                </button>
              </form>
            ) : (
              <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-400">
                Add an Email Template on the Leads page first, then come back to add steps here.
              </p>
            )}
          </div>
        ))}
        {sequences.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No sequences yet — create one below.
          </p>
        )}
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">New Sequence</h2>
      <form
        action={createSequence}
        className="mt-3 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required className={inputClass} placeholder="e.g. Roofers — 3 Touch" />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" name="autoSend" className="h-4 w-4 rounded border-zinc-300" />
          Send automatically (otherwise each step waits for a one-click send from Leads)
        </label>
        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Create Sequence
          </button>
        </div>
      </form>
    </div>
  );
}
