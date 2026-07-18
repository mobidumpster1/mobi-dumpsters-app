import { redirect } from "next/navigation";
import Link from "next/link";
import { hasPlan, requireUser } from "@/lib/session";
import { AutomationTriggerBuilder } from "@/components/AutomationTriggerBuilder";
import { createRule } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAutomationRulePage() {
  const user = await requireUser();
  if (!hasPlan(user, "pro") || user.role !== "owner") redirect("/");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-ink">New Automation Rule</h1>
        <Link href="/automation" className="text-sm font-semibold text-zinc-600 hover:underline">
          Cancel
        </Link>
      </div>
      <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <AutomationTriggerBuilder action={createRule} submitLabel="Create Rule" />
      </div>
    </div>
  );
}
