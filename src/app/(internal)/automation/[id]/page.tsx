import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { hasPlan, requireUser } from "@/lib/session";
import { formatDateAndTime } from "@/lib/date";
import { AutomationTriggerBuilder } from "@/components/AutomationTriggerBuilder";
import { AutomationRulePreview } from "@/components/AutomationRulePreview";
import { updateRule } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditAutomationRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPlan(user, "pro") || user.role !== "owner") redirect("/");

  const { id } = await params;
  const rule = await db.automationRule.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
    include: { executions: { orderBy: { executedAt: "desc" }, take: 20 } },
  });
  if (!rule) notFound();

  const updateRuleWithId = updateRule.bind(null, rule.id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-ink">Edit Rule</h1>
        <Link href="/automation" className="text-sm font-semibold text-zinc-600 hover:underline">
          Back to Automation
        </Link>
      </div>

      <div className="mt-6">
        <AutomationRulePreview ruleId={rule.id} />
      </div>

      <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <AutomationTriggerBuilder
          action={updateRuleWithId}
          submitLabel="Save Changes"
          initial={{
            name: rule.name,
            triggerEntity: rule.triggerEntity as "lead" | "booking" | "invoice" | "quote" | "customer",
            triggerValue: rule.triggerValue,
            conditionField: rule.conditionField,
            conditionOperator: rule.conditionOperator,
            conditionValue: rule.conditionValue,
            actionType: rule.actionType as "send_email" | "send_sms" | "create_customer_note",
            actionSubject: rule.actionSubject,
            actionBody: rule.actionBody,
            maxPerRun: rule.maxPerRun,
            maxPerDay: rule.maxPerDay,
          }}
        />
      </div>

      <h2 className="mt-8 text-xl font-black text-ink">Recent Activity</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">When</th>
              <th className="px-5 py-3.5 font-semibold">Entity</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rule.executions.map((exec) => (
              <tr key={exec.id}>
                <td className="px-5 py-4 text-zinc-600">{formatDateAndTime(exec.executedAt)}</td>
                <td className="px-5 py-4 text-zinc-600">
                  {exec.entityType} {exec.entityId.slice(0, 8)}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      exec.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {exec.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-zinc-500">{exec.error ?? "—"}</td>
              </tr>
            ))}
            {rule.executions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-4 text-center text-zinc-400">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
