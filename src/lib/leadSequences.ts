import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/email";
import { branding } from "@/lib/branding";
import { logAction } from "@/lib/auditLog";
import { getLeadOutreachSettings } from "@/lib/leadOutreachSettings";

const MS_PER_DAY = 86_400_000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

// Every sequence email is commercial outreach to someone who never
// explicitly opted in, so it always gets an unsubscribe link and the
// business's physical address, regardless of whether the send was
// triggered by the cron or by a person clicking "Send" on a due item —
// CAN-SPAM compliance shouldn't depend on which button was pressed.
function appendComplianceFooter(body: string, enrollmentId: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const unsubscribeUrl = `${origin}/leads/unsubscribe/${enrollmentId}`;
  return [
    body,
    "",
    "---",
    branding.businessName,
    branding.yardAddress,
    "",
    `Don't want emails like this? Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
}

// The one place a sequence email actually gets sent — called by the cron
// for autoSend sequences, and by the "Send" button on a due item for
// manual ones. Never throws (mirrors sendPendingInvoiceReminders): a
// single bad send shouldn't take down a whole cron run, and a manual
// caller gets a result object it can show instead of a thrown error.
export async function sendSequenceStep(enrollmentId: string): Promise<
  | { ok: true; status: "sent" | "completed" }
  | { ok: false; reason: string }
> {
  const enrollment = await db.leadSequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      lead: true,
      sequence: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });
  if (!enrollment) return { ok: false, reason: "Enrollment not found." };
  if (enrollment.status !== "active") return { ok: false, reason: "This enrollment isn't active." };

  const { lead, sequence } = enrollment;

  if (!sequence.active) {
    await db.leadSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "stopped", stoppedReason: "manual", nextDueAt: null },
    });
    return { ok: false, reason: "This sequence has been turned off." };
  }
  if (lead.status !== "new") {
    await db.leadSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "stopped", stoppedReason: "status_changed", nextDueAt: null },
    });
    return { ok: false, reason: "Lead's status has changed since enrolling — sequence stopped." };
  }
  if (lead.emailOptOut) {
    await db.leadSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "stopped", stoppedReason: "unsubscribed", nextDueAt: null },
    });
    return { ok: false, reason: "This lead has unsubscribed." };
  }
  if (!lead.email) {
    await db.leadSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "stopped", stoppedReason: "no_email", nextDueAt: null },
    });
    return { ok: false, reason: "This lead has no email on file." };
  }

  const nextStep = sequence.steps.find((s) => s.order === enrollment.currentStep + 1);
  if (!nextStep) {
    await db.leadSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "completed", nextDueAt: null },
    });
    return { ok: true, status: "completed" };
  }

  const template = await db.leadEmailTemplate.findUnique({ where: { id: nextStep.templateId } });
  if (!template) return { ok: false, reason: "This step's template no longer exists." };

  const subject = template.subject.replaceAll("{{businessName}}", lead.name);
  const body = appendComplianceFooter(
    template.body.replaceAll("{{businessName}}", lead.name),
    enrollment.id
  );

  // Only routes through the per-lead parseable reply address once inbound
  // parsing is actually configured (LEAD_REPLY_DOMAIN set) — until then,
  // sendCustomerEmail falls back to its default reply-to (the monitored
  // business inbox), so this is inert with no setup required.
  const replyTo = process.env.LEAD_REPLY_DOMAIN
    ? `lead-${lead.id}@${process.env.LEAD_REPLY_DOMAIN}`
    : undefined;

  let resendEmailId: string | undefined;
  try {
    resendEmailId = await sendCustomerEmail(lead.email, subject, body, replyTo);
  } catch (error) {
    console.error(`Failed to send sequence step for enrollment ${enrollmentId}:`, error);
    return { ok: false, reason: "The email failed to send — try again shortly." };
  }

  const followingStep = sequence.steps.find((s) => s.order === nextStep.order + 1);
  const now = new Date();

  await db.$transaction([
    db.leadSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStep: nextStep.order,
        lastSentAt: now,
        nextDueAt: followingStep ? addDays(now, followingStep.delayDays) : null,
        status: followingStep ? "active" : "completed",
      },
    }),
    db.lead.update({ where: { id: lead.id }, data: { lastEmailSentAt: now } }),
    db.leadEmailSend.create({
      data: {
        leadId: lead.id,
        templateId: template.id,
        subject,
        sentAt: now,
        resendEmailId,
        source: sequence.autoSend ? "sequence_auto" : "sequence_manual",
      },
    }),
  ]);

  await logAction("lead.sequence_step_sent", "LeadSequenceEnrollment", enrollmentId);

  return { ok: true, status: followingStep ? "sent" : "completed" };
}

// Enrolls a lead in a sequence, computing when step 1 comes due. Silently
// no-ops (rather than throwing) if the lead has no email, has opted out,
// or is already enrolled in this sequence — callers doing a bulk enroll
// just want a count of what happened, not a hard failure per lead.
export async function enrollLeadInSequence(
  leadId: string,
  sequenceId: string
): Promise<"enrolled" | "skipped"> {
  const [lead, sequence, existing] = await Promise.all([
    db.lead.findUnique({ where: { id: leadId } }),
    db.emailSequence.findUnique({
      where: { id: sequenceId },
      include: { steps: { orderBy: { order: "asc" }, take: 1 } },
    }),
    db.leadSequenceEnrollment.findUnique({
      where: { leadId_sequenceId: { leadId, sequenceId } },
    }),
  ]);

  if (!lead || !lead.email || lead.emailOptOut || lead.status !== "new") return "skipped";
  if (!sequence || !sequence.active || sequence.steps.length === 0) return "skipped";
  if (existing && existing.status === "active") return "skipped";

  const firstStep = sequence.steps[0];
  const nextDueAt = addDays(new Date(), firstStep.delayDays);

  await db.leadSequenceEnrollment.upsert({
    where: { leadId_sequenceId: { leadId, sequenceId } },
    create: { leadId, sequenceId, nextDueAt },
    update: {
      currentStep: 0,
      status: "active",
      stoppedReason: null,
      enrolledAt: new Date(),
      lastSentAt: null,
      nextDueAt,
    },
  });

  return "enrolled";
}

export async function stopEnrollment(enrollmentId: string, reason: string = "manual") {
  await db.leadSequenceEnrollment.update({
    where: { id: enrollmentId },
    data: { status: "stopped", stoppedReason: reason, nextDueAt: null },
  });
}

// Stops every active sequence a lead is currently in — used whenever
// something external makes the lead no longer a fit for automated
// outreach (a status change, or an actual reply coming in).
export async function stopAllActiveEnrollmentsForLead(leadId: string, reason: string) {
  const activeEnrollments = await db.leadSequenceEnrollment.findMany({
    where: { leadId, status: "active" },
    select: { id: true },
  });
  for (const { id } of activeEnrollments) {
    await stopEnrollment(id, reason);
  }
}

// Called once a day by the cron — only advances enrollments belonging to
// autoSend sequences. Manual (non-autoSend) sequences rely on nextDueAt
// alone, read directly by the Leads page's due-list, with a person
// clicking Send instead of this loop doing it.
//
// Capped at dailySendCap (LeadOutreachSettings) even if more are due —
// a large backlog firing all at once reads as automated/spammy and can
// hurt a sending domain's reputation. Oldest-due leads go first, so a
// backlog gets worked down over successive days rather than the same
// newest leads winning the cap every time. Only counts sends this cron
// itself made today (source: "sequence_auto") — a human clicking Send
// on a manual sequence doesn't eat into this budget.
export async function sendDueAutomatedSequenceSteps() {
  const settings = await getLeadOutreachSettings();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sentToday = await db.leadEmailSend.count({
    where: { source: "sequence_auto", sentAt: { gte: startOfDay } },
  });
  const remaining = Math.max(0, settings.dailySendCap - sentToday);

  if (remaining === 0) {
    return { checked: 0, sent: 0, stopped: 0, errors: [] as string[], cappedForToday: true };
  }

  const due = await db.leadSequenceEnrollment.findMany({
    where: {
      status: "active",
      nextDueAt: { lte: new Date() },
      sequence: { autoSend: true, active: true },
    },
    orderBy: { nextDueAt: "asc" },
    take: remaining,
    select: { id: true },
  });

  let sent = 0;
  let stopped = 0;
  const errors: string[] = [];

  for (const { id } of due) {
    const result = await sendSequenceStep(id);
    if (result.ok) {
      sent++;
    } else {
      stopped++;
      errors.push(`${id}: ${result.reason}`);
    }
  }

  return { checked: due.length, sent, stopped, errors, cappedForToday: false };
}
