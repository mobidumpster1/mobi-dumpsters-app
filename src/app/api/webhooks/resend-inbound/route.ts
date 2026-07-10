import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
import { stopAllActiveEnrollmentsForLead } from "@/lib/leadSequences";
import { logAction } from "@/lib/auditLog";
import { verifyResendWebhookSignature } from "@/lib/resendWebhook";

// Called by Resend the moment a reply arrives at a lead's per-lead
// address (lead-<id>@LEAD_REPLY_DOMAIN, see leadSequences.ts). Inert
// (501) until both env vars below are actually configured — nothing
// calls this route until inbound parsing is set up in Resend and DNS.
export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  const replyDomain = process.env.LEAD_REPLY_DOMAIN;
  if (!webhookSecret || !replyDomain) {
    return NextResponse.json({ error: "Inbound email isn't configured" }, { status: 501 });
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  const valid = verifyResendWebhookSignature(
    webhookSecret,
    { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
    rawBody
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "email.received" || !event.data) {
    return NextResponse.json({ ok: true });
  }

  const toAddresses = Array.isArray(event.data.to) ? (event.data.to as string[]) : [];
  const escapedDomain = replyDomain.replace(/\./g, "\\.");
  const leadPattern = new RegExp(`^lead-([a-z0-9]+)@${escapedDomain}$`, "i");
  const leadId = toAddresses.map((addr) => addr.match(leadPattern)?.[1]).find(Boolean);

  if (!leadId) {
    // Not addressed to a lead reply address — nothing for us to do.
    return NextResponse.json({ ok: true });
  }

  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ ok: true });
  }

  // The webhook event only carries metadata — the actual body needs a
  // follow-up call. See https://resend.com/docs/api-reference/emails/retrieve-received-email
  let replyBody = "(Couldn't load the reply content — check the Resend dashboard.)";
  const emailId = event.data.email_id;
  if (typeof emailId === "string" && process.env.RESEND_API_KEY) {
    try {
      const detailRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      if (detailRes.ok) {
        const detail = await detailRes.json();
        replyBody = detail.text || detail.html || replyBody;
      }
    } catch (error) {
      console.error("Failed to fetch inbound email content:", error);
    }
  }

  await db.lead.update({
    where: { id: leadId },
    data: { status: "interested", repliedAt: new Date() },
  });

  await stopAllActiveEnrollmentsForLead(leadId, "replied");
  await logAction("lead.replied", "Lead", leadId);

  await sendNotificationEmail(
    `${lead.name} replied to your outreach`,
    [
      `${lead.name} replied to a sequence email. Status was set to Interested and their sequence has stopped.`,
      "",
      `From: ${typeof event.data.from === "string" ? event.data.from : "unknown"}`,
      `Subject: ${typeof event.data.subject === "string" ? event.data.subject : "(no subject)"}`,
      "",
      replyBody,
    ].join("\n")
  );

  return NextResponse.json({ ok: true });
}
