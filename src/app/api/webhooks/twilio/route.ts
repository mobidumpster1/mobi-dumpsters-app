import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAnyTwilioConnection, verifyTwilioSignature } from "@/lib/twilio";
import { lastTenDigits } from "@/lib/phone";
import { sendNotificationEmail, siteOrigin } from "@/lib/email";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

// Twilio posts here for two different reasons, distinguished by which
// params are present — an inbound text (has "Body") or a delivery-status
// update for a text we sent (has "MessageStatus", no "Body"). Both are
// form-encoded, not JSON. Already covered by proxy.ts's public
// /api/webhooks prefix, no middleware changes needed. Single-connection
// lookup only, same limitation noted in getAnyTwilioConnection.
export async function POST(request: Request) {
  const connection = await getAnyTwilioConnection();
  if (!connection) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
  }

  const valid = verifyTwilioSignature(connection.authToken, request.url, params, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if ("Body" in params) {
    const from = params.From ?? "";
    const body = params.Body ?? "";
    const twilioSid = params.MessageSid;
    const last10 = lastTenDigits(from);

    const customers = last10
      ? await db.customer.findMany({
          where: { organizationId: connection.organizationId, phone: { not: null } },
          select: { id: true, name: true, phone: true },
        })
      : [];
    const matched = customers.find((c) => lastTenDigits(c.phone) === last10) ?? null;

    if (matched) {
      await db.customerSmsMessage.create({
        data: {
          organizationId: connection.organizationId,
          customerId: matched.id,
          direction: "inbound",
          body,
          status: "received",
          twilioSid,
        },
      });
    }

    // Notify staff either way — an unmatched number still deserves a
    // heads-up rather than silently disappearing.
    await sendNotificationEmail(
      matched ? `${matched.name} texted you` : `New text from ${from}`,
      [
        matched
          ? `New text from ${matched.name} (${from}):`
          : `New text from an unrecognized number (${from}):`,
        "",
        body,
        "",
        matched
          ? `Reply from the app: ${siteOrigin()}/customers/${matched.id}`
          : "This number doesn't match any customer on file.",
      ].join("\n")
    );

    return new NextResponse(EMPTY_TWIML, { status: 200, headers: { "Content-Type": "text/xml" } });
  }

  if (typeof params.MessageStatus === "string") {
    const twilioSid = params.MessageSid;
    if (twilioSid) {
      await db.customerSmsMessage.updateMany({
        where: { twilioSid },
        data: { status: params.MessageStatus },
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
