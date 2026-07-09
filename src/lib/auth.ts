import crypto from "crypto";

export const SESSION_COOKIE = "mobi_session";

// scrypt with a random per-password salt, stored as "salt:hash" hex — no
// extra dependency needed since Node's crypto module already has this.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = crypto.scryptSync(password, salt, 64);
  if (hashBuffer.length !== candidateBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// The cookie value is a signed, self-contained token (userId + expiry) —
// not a DB-backed session — so the proxy can verify it on every request
// without a database round trip. Actual permission checks (and enforcing
// `active`) happen where the real User row gets looked up: src/lib/session.ts,
// which runs in Node routes/actions that already have DB access.
export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + THIRTY_DAYS_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined | null): { userId: string } | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
