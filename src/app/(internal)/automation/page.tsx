import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPlan, requireUser } from "@/lib/session";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ACTION_TYPE_LABELS } from "@/lib/automation";
import { toggleRuleEnabled, deleteRule } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const user = await requireUser();
  if (!hasPlan(user, "pro") || user.role !== "owner") redirect("/");

  const rules = await db.automationRule.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Automation</h1>
          <p className="mt-1 text-zinc-500">
            Staff-configured &quot;when X happens, do Y&quot; rules — checked once a day. Owner-only
            given the blast radius of a misconfigured rule.
          </p>
        </div>
        <Link
          href="/automation/new"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          + New Rule
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-lg border-2 border-zinc-900 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/automation/${rule.id}`} className="font-semibold text-ink hover:underline">
                  {rule.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {rule.triggerEntity} {rule.triggerValue ? `→ ${rule.triggerValue}` : "(any)"} —{" "}
                  {ACTION_TYPE_LABELS[rule.actionType as keyof typeof ACTION_TYPE_LABELS] ?? rule.actionType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={toggleRuleEnabled.bind(null, rule.id, !rule.enabled)}>
                  <button
                    type="submit"
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${
                      rule.enabled ? "bg-green-600 text-white" : "border-2 border-zinc-300 text-zinc-600"
                    }`}
                  >
                    {rule.enabled ? "Auto-Run: On" : "Auto-Run: Off"}
                  </button>
                </form>
                <form action={deleteRule.bind(null, rule.id)}>
                  <ConfirmButton
                    message={`Delete the "${rule.name}" rule? Its execution history goes with it.`}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No automation rules yet — create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
