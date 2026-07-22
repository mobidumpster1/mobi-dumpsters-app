import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/email";
import { sendCustomerSms } from "@/lib/twilio";
import { postToFacebook } from "@/lib/facebook";
import { branding } from "@/lib/branding";
import { getAutomationSettings } from "@/lib/automationSettings";

export type TriggerEntity = "lead" | "booking" | "invoice" | "quote" | "customer";
export type ActionType = "send_email" | "send_sms" | "create_customer_note" | "post_facebook";
export type ConditionOperator = "equals" | "not_equals" | "greater_than" | "less_than";

// What each entity can trigger on, and the at-most-one extra flat filter
// a rule can add on top. Customer has no status field — it's a pure
// existence trigger (triggerValue is always null for it).
export const TRIGGER_CATALOG: Record<
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

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  send_email: "Send an email",
  send_sms: "Send a text (SMS)",
  create_customer_note: "Add a customer note",
  post_facebook: "Post to Facebook Page",
};

type Candidate = {
  entityId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  customerId: string | null;
};

// Local copy of emailTemplates.ts's {{var}} interpolation — kept separate
// since that file's render() isn't exported and automation variables
// (entity-specific) are a different set than the fixed email-template ones.
function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) =>
    key in variables ? variables[key] : match
  );
}

function applyCondition(
  value: unknown,
  operator: ConditionOperator | null,
  target: string | null
): boolean {
  if (!operator || target === null) return true;
  if (typeof value === "number") {
    const targetNum = Number(target);
    if (operator === "greater_than") return value > targetNum;
    if (operator === "less_than") return value < targetNum;
    if (operator === "equals") return value === targetNum;
    if (operator === "not_equals") return value !== targetNum;
  }
  const strValue = value == null ? "" : String(value);
  if (operator === "equals") return strValue === target;
  if (operator === "not_equals") return strValue !== target;
  return true;
}

// Finds entities matching this rule's trigger+condition that haven't
// already fired for this rule — the "currently matches AND hasn't fired
// yet" polling design. `limit` caps how many are returned (0 = unlimited,
// used by the preview).
async function findCandidates(
  rule: { triggerEntity: string; triggerValue: string | null; conditionField: string | null; conditionOperator: string | null; conditionValue: string | null; id: string },
  organizationId: string,
  limit: number
): Promise<Candidate[]> {
  const alreadyFired = await db.automationRuleExecution.findMany({
    where: { ruleId: rule.id },
    select: { entityId: true },
  });
  const excludeIds = alreadyFired.map((e) => e.entityId);
  const takeArg = limit > 0 ? { take: limit } : {};

  switch (rule.triggerEntity as TriggerEntity) {
    case "lead": {
      const leads = await db.lead.findMany({
        where: {
          organizationId,
          id: { notIn: excludeIds },
          ...(rule.triggerValue ? { status: rule.triggerValue } : {}),
        },
        include: { customer: true },
        orderBy: { updatedAt: "asc" },
        ...takeArg,
      });
      return leads
        .filter((l) => applyCondition(l.source, rule.conditionOperator as ConditionOperator, rule.conditionValue))
        .map((l) => ({
          entityId: l.id,
          contactName: l.name,
          contactEmail: l.email,
          contactPhone: l.phone,
          customerId: l.customerId,
        }));
    }
    case "booking": {
      const bookings = await db.booking.findMany({
        where: {
          organizationId,
          id: { notIn: excludeIds },
          ...(rule.triggerValue ? { status: rule.triggerValue } : {}),
        },
        include: { customer: true },
        orderBy: { updatedAt: "asc" },
        ...takeArg,
      });
      return bookings.map((b) => ({
        entityId: b.id,
        contactName: b.customer.name,
        contactEmail: b.customer.email,
        contactPhone: b.customer.phone,
        customerId: b.customerId,
      }));
    }
    case "invoice": {
      const invoices = await db.invoice.findMany({
        where: {
          organizationId,
          id: { notIn: excludeIds },
          ...(rule.triggerValue ? { status: rule.triggerValue } : {}),
        },
        include: { booking: { include: { customer: true } }, customer: true },
        orderBy: { createdAt: "asc" },
        ...takeArg,
      });
      return invoices
        .filter((i) => applyCondition(i.amount, rule.conditionOperator as ConditionOperator, rule.conditionValue))
        .map((i) => {
          const customer = i.booking?.customer ?? i.customer;
          return {
            entityId: i.id,
            contactName: customer?.name ?? "—",
            contactEmail: customer?.email ?? null,
            contactPhone: customer?.phone ?? null,
            customerId: customer?.id ?? null,
          };
        });
    }
    case "quote": {
      const quotes = await db.quote.findMany({
        where: {
          organizationId,
          id: { notIn: excludeIds },
          ...(rule.triggerValue ? { status: rule.triggerValue } : {}),
        },
        include: { customer: true, lead: true },
        orderBy: { createdAt: "asc" },
        ...takeArg,
      });
      return quotes.map((q) => {
        const contact = q.customer ?? q.lead;
        return {
          entityId: q.id,
          contactName: contact?.name ?? "—",
          contactEmail: contact?.email ?? null,
          contactPhone: contact?.phone ?? null,
          customerId: q.customerId,
        };
      });
    }
    case "customer": {
      const customers = await db.customer.findMany({
        where: { organizationId, id: { notIn: excludeIds } },
        orderBy: { createdAt: "asc" },
        ...takeArg,
      });
      return customers
        .filter((c) => applyCondition(c.leadSource, rule.conditionOperator as ConditionOperator, rule.conditionValue))
        .map((c) => ({
          entityId: c.id,
          contactName: c.name,
          contactEmail: c.email,
          contactPhone: c.phone,
          customerId: c.id,
        }));
    }
  }
}

// Dry-run: same candidate-matching query with zero sends and zero
// execution-row writes, so staff can sanity-check a rule before enabling
// it — the mitigation for a newly-enabled rule matching a large existing
// backlog all at once.
export async function previewAutomationRule(ruleId: string, organizationId: string) {
  const rule = await db.automationRule.findFirstOrThrow({ where: { id: ruleId, organizationId } });
  const candidates = await findCandidates(rule, organizationId, 0);
  return {
    matchCount: candidates.length,
    sample: candidates.slice(0, 10).map((c) => ({ name: c.contactName, id: c.entityId })),
  };
}

async function executeRuleForCandidate(
  rule: { id: string; organizationId: string; name: string; actionType: string; actionSubject: string | null; actionBody: string },
  candidate: Candidate
): Promise<{ status: "sent" | "failed"; error?: string }> {
  try {
    const variables = { businessName: branding.businessName, customerName: candidate.contactName };
    const body = interpolate(rule.actionBody, variables);

    if (rule.actionType === "send_email") {
      if (!candidate.contactEmail) throw new Error("No email on file");
      const subject = interpolate(rule.actionSubject ?? rule.name, variables);
      await sendCustomerEmail(candidate.contactEmail, subject, body);
    } else if (rule.actionType === "send_sms") {
      if (!candidate.customerId) throw new Error("No linked customer to text");
      if (!candidate.contactPhone) throw new Error("No phone on file");
      await sendCustomerSms(
        rule.organizationId,
        { id: candidate.customerId, phone: candidate.contactPhone },
        body
      );
    } else if (rule.actionType === "create_customer_note") {
      if (!candidate.customerId) throw new Error("No linked customer for a note");
      await db.customerNote.create({
        data: { customerId: candidate.customerId, type: "note", content: body },
      });
    } else if (rule.actionType === "post_facebook") {
      // Text-only — none of the five trigger entities has one canonical
      // "this is the photo" field, and guessing wrong risks posting the
      // wrong (or a private/internal) photo publicly. The manual
      // FacebookShareBox button on a booking's Photos tab is still the
      // only way to attach a specific photo.
      await postToFacebook(rule.organizationId, body);
    }
    return { status: "sent" };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}

// Runs one rule against up to `orgRemaining` candidates (also capped by
// the rule's own maxPerDay/maxPerRun) — the shared core used by both the
// daily cron and a manual "Run Now" click. One candidate's failure never
// stops the batch — a failed send still writes the execution row so a
// permanently-broken entity doesn't retry forever.
async function runRule(
  rule: { id: string; organizationId: string; name: string; triggerEntity: string; triggerValue: string | null; conditionField: string | null; conditionOperator: string | null; conditionValue: string | null; actionType: string; actionSubject: string | null; actionBody: string; maxPerRun: number; maxPerDay: number },
  organizationId: string,
  orgRemaining: number,
  todayStart: Date
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const ruleFiredToday = await db.automationRuleExecution.count({
    where: { ruleId: rule.id, status: "sent", executedAt: { gte: todayStart } },
  });
  const remaining = Math.min(orgRemaining, rule.maxPerDay - ruleFiredToday, rule.maxPerRun);
  if (remaining <= 0) return { sent, failed };

  const candidates = await findCandidates(rule, organizationId, remaining);

  for (const candidate of candidates) {
    const result = await executeRuleForCandidate(rule, candidate);
    await db.automationRuleExecution.create({
      data: {
        ruleId: rule.id,
        entityType: rule.triggerEntity,
        entityId: candidate.entityId,
        status: result.status,
        error: result.error,
      },
    });
    if (result.status === "sent") {
      sent += 1;
    } else {
      failed += 1;
    }
    if (sent >= remaining) break;
  }

  return { sent, failed };
}

// The daily cron entry point. Per org with Pro plan and ≥1 enabled rule:
// skip the whole org once its AutomationSettings.dailyActionCap is hit;
// per enabled rule (oldest-created first, same fairness precedent as
// LeadOutreachSettings), cap by maxPerRun/maxPerDay too.
export async function runAutomationRules() {
  const organizations = await db.organization.findMany({ where: { plan: "pro" }, select: { id: true } });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  let totalSent = 0;
  let totalFailed = 0;
  const skippedOrgs: string[] = [];

  for (const org of organizations) {
    const settings = await getAutomationSettings(org.id);
    const orgActionsToday = await db.automationRuleExecution.count({
      where: {
        status: "sent",
        executedAt: { gte: todayStart },
        rule: { organizationId: org.id },
      },
    });
    let orgRemaining = settings.dailyActionCap - orgActionsToday;
    if (orgRemaining <= 0) {
      skippedOrgs.push(org.id);
      continue;
    }

    const rules = await db.automationRule.findMany({
      where: { organizationId: org.id, enabled: true },
      orderBy: { createdAt: "asc" },
    });

    for (const rule of rules) {
      if (orgRemaining <= 0) break;
      const result = await runRule(rule, org.id, orgRemaining, todayStart);
      totalSent += result.sent;
      totalFailed += result.failed;
      orgRemaining -= result.sent;
    }
  }

  return { sent: totalSent, failed: totalFailed, skippedOrgs };
}

// Manual "Run Now" — fires one specific rule immediately, regardless of
// its enabled/disabled state (a staff member who prefers manual control
// over full automation can leave a rule disabled and just click this
// whenever they want it to go out). Still respects the rule's own
// maxPerRun/maxPerDay and the org's overall dailyActionCap — this is a
// manual trigger, not a bypass of the safety caps.
export async function runRuleNow(ruleId: string, organizationId: string) {
  const rule = await db.automationRule.findFirstOrThrow({ where: { id: ruleId, organizationId } });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const settings = await getAutomationSettings(organizationId);
  const orgActionsToday = await db.automationRuleExecution.count({
    where: { status: "sent", executedAt: { gte: todayStart }, rule: { organizationId } },
  });
  const orgRemaining = settings.dailyActionCap - orgActionsToday;
  if (orgRemaining <= 0) {
    throw new Error("Today's automation action cap has already been reached for this organization.");
  }

  return runRule(rule, organizationId, orgRemaining, todayStart);
}
