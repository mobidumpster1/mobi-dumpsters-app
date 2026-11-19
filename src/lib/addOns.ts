// Paid add-ons (the AI Secretary, the AI phone agent) are sold separately, so
// the core app must work, and look right, without them. An add-on's
// navigation entry only appears when it is switched on.
//
// For now it is a platform-wide switch: ENABLED_ADDONS="secretary,phone-agent"
// in the environment. Once add-ons are sold per business this becomes a
// per-business setting; callers only use enabledAddOns(), so that change
// stays in this file.
export type AddOn = "secretary" | "phone-agent";

export function enabledAddOns(): AddOn[] {
  return (process.env.ENABLED_ADDONS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is AddOn => value === "secretary" || value === "phone-agent");
}
