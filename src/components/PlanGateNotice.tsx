import { UpgradeButton } from "@/app/(internal)/settings/BillingButtons";

const PLAN_LABELS: Record<"team" | "pro", string> = { team: "Team", pro: "Pro" };

// A short teaser shown in place of a feature's real UI when the org's
// plan doesn't reach the required tier — deliberately shows what's behind
// the paywall (per the pricing doc's own "feel the pull" framing) rather
// than hiding the feature outright, and offers a one-click upgrade.
export function PlanGateNotice({
  requiredPlan,
  description,
}: {
  requiredPlan: "team" | "pro";
  description: string;
}) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
      <p className="text-sm text-zinc-600">
        This is a {PLAN_LABELS[requiredPlan]}-plan feature. {description}
      </p>
      <div className="mt-3">
        <UpgradeButton targetPlan={requiredPlan} label={`Upgrade to ${PLAN_LABELS[requiredPlan]}`} />
      </div>
    </div>
  );
}
