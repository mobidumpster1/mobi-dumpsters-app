import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getAnyStripeConnection, constructWebhookEvent, savePaymentMethodFromSetupIntent } from "@/lib/stripe";
import { markInvoicePaidViaStripe, markInstallmentPaidViaStripe } from "@/lib/invoicing";

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

  // Stripe retries a delivery on any non-2xx response, and duplicate/
  // out-of-order delivery was previously only as safe as each downstream
  // handler's own idempotency — real for invoice/installment status
  // (markInvoicePaidViaStripe/markInstallmentPaidViaStripe already no-op
  // once paid), but not for the QuickBooks push those functions also
  // trigger, which could fire again on every redelivery. Recorded *after*
  // successful processing (not here), same reasoning as the
  // platform-billing webhook: a crash partway through should still let a
  // real retry run again rather than being silently swallowed.
  const alreadyProcessed = await db.processedRentalWebhookEvent.findUnique({
    where: { id: event.id },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const installmentId = paymentIntent.metadata?.installmentId;
    const invoiceId = paymentIntent.metadata?.invoiceId;
    if (installmentId) {
      await markInstallmentPaidViaStripe(installmentId, connection.organizationId, paymentIntent.id);
    } else if (invoiceId) {
      await markInvoicePaidViaStripe(invoiceId, connection.organizationId, paymentIntent.id, paymentIntent.amount_received);
    }
  } else if (event.type === "setup_intent.succeeded") {
    const setupIntent = event.data.object as Stripe.SetupIntent;
    await savePaymentMethodFromSetupIntent(connection.organizationId, setupIntent.id);
  }

  await db.processedRentalWebhookEvent.create({ data: { id: event.id, type: event.type } });
  return NextResponse.json({ ok: true });
}
