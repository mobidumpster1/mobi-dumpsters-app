import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getAnyStripeConnection, constructWebhookEvent, savePaymentMethodFromSetupIntent } from "@/lib/stripe";
import { markInvoicePaidViaStripe } from "@/lib/invoicing";

// Belt-and-suspenders backstop for the two places that already handle
// their own success case directly (chargeCardOnFile's caller marks the
// invoice paid immediately; the booking flow saves the card as soon as
// the client confirms the SetupIntent) — this catches the cases where
// that direct path never completes (server crash, closed tab, etc).
// Single-connection lookup only, same limitation noted in
// getAnyStripeConnection: fine for one directly-connected business, would
// need Stripe Connect for true multi-tenant webhook routing.
export async function POST(request: Request) {
  const connection = await getAnyStripeConnection();
  if (!connection || !connection.webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(connection, rawBody, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = paymentIntent.metadata?.invoiceId;
    if (invoiceId) {
      await markInvoicePaidViaStripe(invoiceId, connection.organizationId, paymentIntent.id);
    }
  } else if (event.type === "setup_intent.succeeded") {
    const setupIntent = event.data.object as Stripe.SetupIntent;
    await savePaymentMethodFromSetupIntent(connection.organizationId, setupIntent.id);
  }

  return NextResponse.json({ ok: true });
}
