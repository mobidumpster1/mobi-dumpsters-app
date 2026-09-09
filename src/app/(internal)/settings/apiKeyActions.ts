"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { generateApiKey, hashApiKey } from "@/lib/apiAuth";
import { requireUser } from "@/lib/session";

// Returns the plaintext key exactly once — the caller (a client component,
// see ApiKeysSection) is responsible for displaying it prominently and
// never re-fetching it, since only the hash is stored from here on.
export async function createApiKey(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const plaintextKey = generateApiKey();
  await db.apiKey.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      name,
      keyHash: hashApiKey(plaintextKey),
      keyPrefix: plaintextKey.slice(0, 12),
    },
  });

  revalidatePath("/settings");
  return { plaintextKey };
}

export async function revokeApiKey(apiKeyId: string) {
  const user = await requireUser();
  await db.apiKey.updateMany({
    where: { id: apiKeyId, organizationId: user.effectiveOrganizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/settings");
}
