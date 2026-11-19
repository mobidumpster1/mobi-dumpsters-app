import { db } from "@/lib/db";

// Paid add-ons (the AI Secretary, the AI phone agent) are sold separately, so
// the core app must work, and look right, without them. Each business has its
// own list, switched on from Platform Admin (Organization.enabledAddOns).
//
// ENABLED_ADDONS in the environment still works as a platform-wide switch on
// top of that (handy on a developer machine); it never removes an add-on a
// business has.
export const ADD_ONS = {
  secretary: "AI Secretary",
  "phone-agent": "AI phone agent",
} as const;

export type AddOn = keyof typeof ADD_ONS;

export const ADD_ON_KEYS = Object.keys(ADD_ONS) as AddOn[];

export function isAddOn(value: string): value is AddOn {
  return (ADD_ON_KEYS as string[]).includes(value);
}

// "secretary, phone-agent, junk" -> ["secretary", "phone-agent"]
export function parseAddOns(value: string | null | undefined): AddOn[] {
  const seen = new Set<AddOn>();
  for (const part of (value ?? "").split(",")) {
    const key = part.trim();
    if (isAddOn(key)) seen.add(key);
  }
  return ADD_ON_KEYS.filter((key) => seen.has(key));
}

export function serializeAddOns(keys: readonly string[]): string {
  return parseAddOns(keys.join(",")).join(",");
}

export async function enabledAddOnsForOrg(organizationId: string): Promise<AddOn[]> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { enabledAddOns: true },
  });
  return parseAddOns(`${org?.enabledAddOns ?? ""},${process.env.ENABLED_ADDONS ?? ""}`);
}

export async function orgHasAddOn(organizationId: string, addOn: AddOn): Promise<boolean> {
  return (await enabledAddOnsForOrg(organizationId)).includes(addOn);
}
