import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stopAllActiveEnrollmentsForLead } from "@/lib/leadSequences";
import { logAction } from "@/lib/auditLog";
import { verifyResendWebhookSignature } from "@/lib/resendWebhook";

// Called by Resend on outbound send events. Two independent things happen
// here per event: (1) email.bounced specifically feeds the lead-email
// suppression logic below (unchanged), and (2) any event whose email_id
// matches a row in EmailDeliveryLog (see sendCustomerEmail's optional
// organizationId param) updates that row's status — delivered, bounced,
// opened, clicked, etc. Distinct from /api/webhooks/resend-inbound (a
// different Resend feature — inbound receiving — with its own webhook
// secret). Bounce webhooks are available on Resend's free plan, unlike
// inbound receiving, so this can be turned on independently. Inert (501)
// until RESEND_EVENTS_WEBHOOK_SECRET is configured.
export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_EVENTS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
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

  const emailId = typeof event.data?.email_id === "string" ? event.data.email_id : null;
  if (!emailId || !event.type?.startsWith("email.")) {
    return NextResponse.json({ ok: true });
  }

  // General delivery tracking (EmailDeliveryLog) — a no-op update if
  // emailId doesn't match a tracked send (most sends aren't tracked; see
  // sendCustomerEmail's optional organizationId param).
  const DELIVERY_LOG_STATUS_BY_EVENT: Record<string, string> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delivery_delayed",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.opened": "opened",
    "email.clicked": "clicked",
  };
  const trackedStatus = DELIVERY_LOG_STATUS_BY_EVENT[event.type];
  if (trackedStatus) {
    await db.emailDeliveryLog.updateMany({
      where: { resendMessageId: emailId },
      data: { status: trackedStatus, lastEventAt: new Date() },
    });
  }

  // Lead-email bounce suppression — unchanged from before delivery
  // tracking was added.
  if (event.type === "email.bounced") {
    const send = await db.leadEmailSend.findFirst({ where: { resendEmailId: emailId } });
    if (send) {
      await db.leadEmailSend.update({ where: { id: send.id }, data: { status: "bounced" } });

      // A hard bounce means the address doesn't exist — continuing to
      // send to it only hurts sender reputation, so this suppresses it
      // the same way an unsubscribe does.
      await db.lead.update({ where: { id: send.leadId }, data: { emailOptOut: true } });
      await stopAllActiveEnrollmentsForLead(send.leadId, "bounced");
      await logAction("lead.email_bounced", "LeadEmailSend", send.id);
    }
  }

  return NextResponse.json({ ok: true });
}
