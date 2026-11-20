import "server-only";
import { db } from "@/lib/db";
import { lastTenDigits } from "@/lib/phone";

// Text-message opt-out (TCPA / carrier rules). A customer who texts STOP must
// not be texted again until they text START. Twilio blocks sends to a number
// that opted out on its own number, but the app has to honor it too: staff
// shouldn't see a "send" button that quietly does nothing, and any other
// provider or number would not be covered.
//
// The list is per business and keyed by the last 10 digits, because phones are
// stored however they were typed.

const OPT_OUT_WORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
const OPT_IN_WORDS = new Set(["start", "unstop"]);

// Only a message that is JUST the keyword counts ("Stop!" yes, "please stop by
// tomorrow" no), same rule carriers use.
export function smsKeyword(body: string): "stop" | "start" | null {
  const word = body.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (body.trim().split(/\s+/).length !== 1) return null;
  if (OPT_OUT_WORDS.has(word)) return "stop";
  if (OPT_IN_WORDS.has(word)) return "start";
  return null;
}

export async function isOptedOut(organizationId: string, phone: string | null | undefined): Promise<boolean> {
  const last10 = lastTenDigits(phone);
  if (!last10) return false;
  const row = await db.smsOptOut.findFirst({ where: { organizationId, phoneLast10: last10 }, select: { id: true } });
  return Boolean(row);
}

export async function recordOptOut(organizationId: string, phone: string): Promise<void> {
  const last10 = lastTenDigits(phone);
  if (!last10) return;
  await db.smsOptOut.upsert({
    where: { organizationId_phoneLast10: { organizationId, phoneLast10: last10 } },
    create: { organizationId, phoneLast10: last10 },
    update: {},
  });
}

export async function clearOptOut(organizationId: string, phone: string): Promise<void> {
  const last10 = lastTenDigits(phone);
  if (!last10) return;
  await db.smsOptOut.deleteMany({ where: { organizationId, phoneLast10: last10 } });
}

// Called by the inbound-text webhook for every incoming message. Returns the
// keyword it acted on, or null for an ordinary message.
export async function applySmsKeyword(organizationId: string, from: string, body: string): Promise<"stop" | "start" | null> {
  const keyword = smsKeyword(body);
  if (keyword === "stop") await recordOptOut(organizationId, from);
  if (keyword === "start") await clearOptOut(organizationId, from);
  return keyword;
}
