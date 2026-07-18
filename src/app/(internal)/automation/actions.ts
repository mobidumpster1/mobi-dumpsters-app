"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser, requirePlanFor } from "@/lib/session";
import { previewAutomationRule, runRuleNow } from "@/lib/automation";

// Rule creation/editing is owner-only in v1, given the blast-radius risk
// of a misconfigured rule emailing/texting a large batch of customers —
// a canManageAutomation staff permission is a trivial v2 addition once
// this has run in production for a while.
async function requireOwner() {
  const user = await requireUser();
  requirePlanFor(user, "pro");
  if (user.role !== "owner") {
    throw new Error("Only the owner can manage automation rules.");
  }
  return user;
}

export async function createRule(formData: FormData) {
  const user = await requireOwner();

  const name = str(formData, "name");
  const triggerEntity = str(formData, "triggerEntity");
  const triggerValue = str(formData, "triggerValue");
  const conditionField = str(formData, "conditionField");
  const conditionOperator = str(formData, "conditionOperator");
  const conditionValue = str(formData, "conditionValue");
  const actionType = str(formData, "actionType");
  const actionSubject = str(formData, "actionSubject");
  const actionBody = str(formData, "actionBody");
  const maxPerRunStr = str(formData, "maxPerRun");
  const maxPerDayStr = str(formData, "maxPerDay");

  if (!name) throw new Error("Name is required.");
  if (!triggerEntity) throw new Error("Trigger entity is required.");
  if (!actionType) throw new Error("Action type is required.");
  if (!actionBody) throw new Error("Action message body is required.");

  const rule = await db.automationRule.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      name,
      triggerEntity,
      triggerField: "status",
      triggerValue: triggerValue || null,
      conditionField: conditionField || null,
      conditionOperator: conditionField ? conditionOperator : null,
      conditionValue: conditionField ? conditionValue : null,
      actionType,
      actionSubject: actionType === "send_email" ? actionSubject : null,
      actionBody,
      maxPerRun: maxPerRunStr ? Number(maxPerRunStr) : 25,
      maxPerDay: maxPerDayStr ? Number(maxPerDayStr) : 100,
    },
  });

  revalidatePath("/automation");
  redirect(`/automation/${rule.id}`);
}

export async function updateRule(ruleId: string, formData: FormData) {
  const user = await requireOwner();

  const name = str(formData, "name");
  const triggerEntity = str(formData, "triggerEntity");
  const triggerValue = str(formData, "triggerValue");
  const conditionField = str(formData, "conditionField");
  const conditionOperator = str(formData, "conditionOperator");
  const conditionValue = str(formData, "conditionValue");
  const actionType = str(formData, "actionType");
  const actionSubject = str(formData, "actionSubject");
  const actionBody = str(formData, "actionBody");
  const maxPerRunStr = str(formData, "maxPerRun");
  const maxPerDayStr = str(formData, "maxPerDay");

  if (!name) throw new Error("Name is required.");
  if (!triggerEntity) throw new Error("Trigger entity is required.");
  if (!actionType) throw new Error("Action type is required.");
  if (!actionBody) throw new Error("Action message body is required.");

  await db.automationRule.updateMany({
    where: { id: ruleId, organizationId: user.effectiveOrganizationId },
    data: {
      name,
      triggerEntity,
      triggerValue: triggerValue || null,
      conditionField: conditionField || null,
      conditionOperator: conditionField ? conditionOperator : null,
      conditionValue: conditionField ? conditionValue : null,
      actionType,
      actionSubject: actionType === "send_email" ? actionSubject : null,
      actionBody,
      maxPerRun: maxPerRunStr ? Number(maxPerRunStr) : 25,
      maxPerDay: maxPerDayStr ? Number(maxPerDayStr) : 100,
    },
  });

  revalidatePath(`/automation/${ruleId}`);
  revalidatePath("/automation");
}

export async function toggleRuleEnabled(ruleId: string, enabled: boolean) {
  const user = await requireOwner();
  await db.automationRule.updateMany({
    where: { id: ruleId, organizationId: user.effectiveOrganizationId },
    data: { enabled },
  });
  revalidatePath("/automation");
  revalidatePath(`/automation/${ruleId}`);
}

export async function deleteRule(ruleId: string) {
  const user = await requireOwner();
  await db.automationRuleExecution.deleteMany({ where: { ruleId } });
  await db.automationRule.deleteMany({
    where: { id: ruleId, organizationId: user.effectiveOrganizationId },
  });
  revalidatePath("/automation");
  redirect("/automation");
}

export async function previewRule(ruleId: string) {
  const user = await requireOwner();
  return previewAutomationRule(ruleId, user.effectiveOrganizationId);
}

export async function runRuleNowAction(ruleId: string) {
  const user = await requireOwner();
  const result = await runRuleNow(ruleId, user.effectiveOrganizationId);
  revalidatePath(`/automation/${ruleId}`);
  return result;
}
