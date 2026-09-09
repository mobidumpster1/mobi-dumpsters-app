import crypto from "crypto";
import { db } from "@/lib/db";

const KEY_PREFIX = "mobi_";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Generates a new API key's plaintext secret. Only ever returned to the
// caller once, at creation time — nothing stores this, only its hash (see
// createApiKey in the settings actions).
export function generateApiKey(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
}

// Reads the Authorization: Bearer <key> header, looks it up by hash, and
// returns the owning organizationId — or null for anything invalid
// (missing header, unknown key, revoked key). Updates lastUsedAt on a
// successful match, best-effort (a failure there shouldn't fail the
// actual request).
export async function authenticateApiRequest(
  request: Request
): Promise<{ organizationId: string; apiKeyId: string } | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const key = auth.slice("Bearer ".length).trim();
  if (!key) return null;

  const apiKey = await db.apiKey.findUnique({ where: { keyHash: hashApiKey(key) } });
  if (!apiKey || apiKey.revokedAt) return null;

  db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch((error) => {
    console.error("Failed to update API key lastUsedAt:", error);
  });

  return { organizationId: apiKey.organizationId, apiKeyId: apiKey.id };
}
