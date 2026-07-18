import crypto from "crypto";
import { db } from "@/lib/db";
import { toE164 } from "@/lib/phone";

type TwilioConnectionRow = {
  id: string;
  organizationId: string;
  accountSid: string;
  authToken: string;
  phoneNumber: string;
};

// Returns the org's Twilio connection, or null if not configured yet —
// callers should treat that as "can't send/receive a text", not an
// error, same convention as getStripeConnection.
export async function getTwilioConnection(organizationId: string): Promise<TwilioConnectionRow | null> {
  return db.twilioConnection.findUnique({ where: { organizationId } });
}

// Used only by the webhook route, which has to identify which org's
// connection to verify an incoming request against before it can even
// process it. Fine while a single business runs this app directly — true
// multi-tenant webhook routing (many orgs, each needing their own
// verified Auth Token) would need a different scheme, same limitation as
// getAnyStripeConnection.
export async function getAnyTwilioConnection(): Promise<TwilioConnectionRow | null> {
  return db.twilioConnection.findFirst();
}

type CustomerInput = {
  id: string;
  phone: string | null;
};

type TwilioConnectionRow2 = { accountSid: string; authToken: string; phoneNumber: string };

// The bare Twilio API call, shared by sendCustomerSms (which also logs the
// send to CustomerSmsMessage) and any caller that needs to text someone
// with no Customer row yet — e.g. a Quote sent to a Lead — to text without
// a conversation thread to log it against.
async function postTwilioMessage(
  connection: TwilioConnectionRow2,
  to: string,
  body: string
): Promise<{ twilioSid: string }> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${connection.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${connection.accountSid}:${connection.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: connection.phoneNumber, Body: body }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error("Twilio send failed:", detail);
    throw new Error("Couldn't send the text — check the Twilio setup.");
  }

  const data = await response.json();
  return { twilioSid: data.sid as string };
}

// Sends a text and records it in the conversation thread. Throws a
// friendly, non-technical message rather than a raw Twilio error, since
// this surfaces directly to whichever staff member clicked "Send".
export async function sendCustomerSms(
  organizationId: string,
  customer: CustomerInput,
  body: string
): Promise<{ twilioSid: string }> {
  const connection = await getTwilioConnection(organizationId);
  if (!connection) {
    throw new Error("Connect Twilio in Settings before sending a text.");
  }
  if (!customer.phone) {
    throw new Error("This customer doesn't have a phone number on file.");
  }
  const to = toE164(customer.phone);
  if (!to) {
    throw new Error("This customer's phone number doesn't look like a valid US number.");
  }

  const { twilioSid } = await postTwilioMessage(connection, to, body);

  await db.customerSmsMessage.create({
    data: {
      organizationId,
      customerId: customer.id,
      direction: "outbound",
      body,
      status: "sent",
      twilioSid,
    },
  });

  return { twilioSid };
}

// Same send, no Customer to log it against — for texting a Lead who
// hasn't converted yet. Returns quietly (rather than throwing) when
// Twilio isn't connected or the number doesn't look valid, since this is
// meant to be a best-effort addition alongside an email, not something
// that should block the whole send.
export async function sendLeadSms(organizationId: string, phone: string | null, body: string) {
  if (!phone) return;
  const connection = await getTwilioConnection(organizationId);
  if (!connection) return;
  const to = toE164(phone);
  if (!to) return;

  try {
    await postTwilioMessage(connection, to, body);
  } catch (error) {
    console.error("Failed to text lead:", error);
  }
}

// Twilio signs webhook requests by HMAC-SHA1'ing the full request URL
// with each POST param's key+value appended directly (sorted by key, no
// separators), keyed by the account's Auth Token, base64-encoded.
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const sortedKeys = Object.keys(params).sort();
  const signedContent = sortedKeys.reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto.createHmac("sha1", authToken).update(signedContent, "utf8").digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}
