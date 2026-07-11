"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";
import { enrollLeadInSequence, sendSequenceStep, stopEnrollment } from "@/lib/leadSequences";

export async function updateDailySendCap(formData: FormData) {
  await requirePermission("canManageLeads");

  const capStr = str(formData, "dailySendCap");
  const dailySendCap = capStr ? Math.max(1, Number(capStr) || 0) : 25;

  const settings = await db.leadOutreachSettings.findFirst();
  if (settings) {
    await db.leadOutreachSettings.update({ where: { id: settings.id }, data: { dailySendCap } });
  } else {
    await db.leadOutreachSettings.create({ data: { dailySendCap } });
  }

  revalidatePath("/leads/sequences");
}

export async function createSequence(formData: FormData) {
  const user = await requirePermission("canManageLeads");

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");
  const autoSend = formData.get("autoSend") === "on";

  const sequence = await db.emailSequence.create({
    data: { organizationId: user.effectiveOrganizationId, name, autoSend },
  });
  await logAction("email_sequence.created", "EmailSequence", sequence.id);
  revalidatePath("/leads/sequences");
}

export async function toggleSequenceAutoSend(sequenceId: string, autoSend: boolean) {
  const user = await requirePermission("canManageLeads");
  await db.emailSequence.updateMany({
    where: { id: sequenceId, organizationId: user.effectiveOrganizationId },
    data: { autoSend },
  });
  revalidatePath("/leads/sequences");
}

export async function toggleSequenceActive(sequenceId: string, active: boolean) {
  const user = await requirePermission("canManageLeads");
  await db.emailSequence.updateMany({
    where: { id: sequenceId, organizationId: user.effectiveOrganizationId },
    data: { active },
  });
  revalidatePath("/leads/sequences");
  revalidatePath("/leads");
}

export async function deleteSequence(sequenceId: string) {
  const user = await requirePermission("canManageLeads");
  await db.emailSequence.deleteMany({
    where: { id: sequenceId, organizationId: user.effectiveOrganizationId },
  });
  await logAction("email_sequence.deleted", "EmailSequence", sequenceId);
  revalidatePath("/leads/sequences");
  revalidatePath("/leads");
}

export async function addSequenceStep(sequenceId: string, formData: FormData) {
  const user = await requirePermission("canManageLeads");

  const templateId = str(formData, "templateId");
  const delayDaysStr = str(formData, "delayDays");
  if (!templateId) throw new Error("A template is required");
  const delayDays = delayDaysStr ? Math.max(0, Number(delayDaysStr) || 0) : 0;

  await db.emailSequence.findFirstOrThrow({
    where: { id: sequenceId, organizationId: user.effectiveOrganizationId },
  });

  const existingCount = await db.sequenceStep.count({ where: { sequenceId } });

  await db.sequenceStep.create({
    data: { sequenceId, templateId, delayDays, order: existingCount + 1 },
  });
  revalidatePath("/leads/sequences");
}

export async function deleteSequenceStep(stepId: string) {
  const user = await requirePermission("canManageLeads");

  await db.sequenceStep.findFirstOrThrow({
    where: { id: stepId, sequence: { organizationId: user.effectiveOrganizationId } },
  });

  const step = await db.sequenceStep.delete({ where: { id: stepId } });

  // Close the order gap left behind and shift every later step down by
  // one, so delayDays (which counts from the previous step) still lines
  // up with a real "previous step" after the deletion.
  await db.sequenceStep.updateMany({
    where: { sequenceId: step.sequenceId, order: { gt: step.order } },
    data: { order: { decrement: 1 } },
  });

  revalidatePath("/leads/sequences");
}

export async function enrollLeadAction(leadId: string, sequenceId: string) {
  const user = await requirePermission("canManageLeads");
  const result = await enrollLeadInSequence(leadId, sequenceId, user.effectiveOrganizationId);
  if (result === "skipped") {
    throw new Error(
      "Couldn't enroll this lead — it may already be enrolled, have no email, or not be in \"new\" status."
    );
  }
  revalidatePath("/leads");
}

// Enrolls every lead in the given list (e.g. everything currently
// filtered on the Leads page) into a sequence in one action, skipping
// anything that isn't eligible (no email, already enrolled, wrong
// status) rather than failing the whole batch.
export async function enrollAllVisibleAction(leadIds: string[], sequenceId: string) {
  const user = await requirePermission("canManageLeads");

  let enrolled = 0;
  let skipped = 0;
  for (const leadId of leadIds) {
    const result = await enrollLeadInSequence(leadId, sequenceId, user.effectiveOrganizationId);
    if (result === "enrolled") enrolled++;
    else skipped++;
  }

  revalidatePath("/leads");
  return { enrolled, skipped };
}

export async function stopEnrollmentAction(enrollmentId: string) {
  const user = await requirePermission("canManageLeads");
  await stopEnrollment(enrollmentId, "manual", user.effectiveOrganizationId);
  revalidatePath("/leads");
}

// The manual-mode "Send" button on a due follow-up — same underlying
// send as the cron uses for autoSend sequences, just triggered by a
// person instead of a schedule.
export async function sendDueNowAction(enrollmentId: string) {
  const user = await requirePermission("canManageLeads");
  const result = await sendSequenceStep(enrollmentId, user.effectiveOrganizationId);
  if (!result.ok) throw new Error(result.reason);
  revalidatePath("/leads");
}
