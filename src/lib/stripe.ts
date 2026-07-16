import Stripe from "stripe";
import { db } from "@/lib/db";

type StripeConnectionRow = {
  id: string;
  organizationId: string;
  secretKey: string;
  publishableKey: string;
  webhookSecret: string | null;
};

// Returns the org's Stripe connection, or null if not configured yet —
// callers should treat that as "can't collect/charge a card", not an
// error, same convention as QuickBooks' getValidConnection.
export async function getStripeConnection(organizationId: string): Promise<StripeConnectionRow | null> {
  return db.stripeConnection.findUnique({ where: { organizationId } });
}

// Used only by the webhook route, which has to identify which org's
// connection to verify an incoming event against before it can even parse
// the event. Fine while a single business runs this app directly — true
// multi-tenant webhook routing (many orgs, each needing their own
// verified secret) would need Stripe Connect, not a plain API-key
// integration like this one.
export async function getAnyStripeConnection(): Promise<StripeConnectionRow | null> {
  return db.stripeConnection.findFirst();
}

function client(connection: StripeConnectionRow) {
  return new Stripe(connection.secretKey);
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

type CustomerInput = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stripeCustomerId: string | null;
};

// Creates (or reuses) a Stripe Customer for this local customer, then
// starts a SetupIntent so the client can collect a card via Stripe
// Elements — this app never sees the raw card number, only Stripe's own
// references, which land on the Customer row once the SetupIntent
// succeeds (see savePaymentMethodFromSetupIntent).
export async function createSetupIntent(
  organizationId: string,
  customer: CustomerInput
): Promise<{ clientSecret: string; publishableKey: string } | null> {
  const connection = await getStripeConnection(organizationId);
  if (!connection) return null;
  const stripe = client(connection);

  let stripeCustomerId = customer.stripeCustomerId;
  if (!stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      name: customer.name,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
    });
    stripeCustomerId = stripeCustomer.id;
    await db.customer.update({ where: { id: customer.id }, data: { stripeCustomerId } });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    usage: "off_session",
  });
  if (!setupIntent.client_secret) {
    throw new Error("Stripe didn't return a client secret for the card form.");
  }

  return { clientSecret: setupIntent.client_secret, publishableKey: connection.publishableKey };
}

// Called once the client confirms the SetupIntent, and again from the
// webhook (setup_intent.succeeded) as the source of truth in case the
// client-side confirmation never reaches the server (closed tab, network
// drop, etc). Saves only Stripe's references plus brand/last4 for
// display — never a raw card number.
export async function savePaymentMethodFromSetupIntent(
  organizationId: string,
  setupIntentId: string
): Promise<void> {
  const connection = await getStripeConnection(organizationId);
  if (!connection) return;
  const stripe = client(connection);

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const stripeCustomerId =
    typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id;
  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
  if (!stripeCustomerId || !paymentMethodId) return;

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  await db.customer.updateMany({
    where: { organizationId, stripeCustomerId },
    data: {
      stripePaymentMethodId: paymentMethodId,
      stripeCardBrand: paymentMethod.card?.brand ?? null,
      stripeCardLast4: paymentMethod.card?.last4 ?? null,
    },
  });
}

type ChargeCustomerInput = {
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
};

// Off-session charge against a customer's saved card — no customer
// interaction needed, used for staff-initiated charges (invoice balance,
// damage, overage, deposits, etc). Throws a friendly, non-technical
// message rather than a raw Stripe error, since this surfaces directly to
// whichever staff member clicked "Charge".
export async function chargeCardOnFile(
  organizationId: string,
  customer: ChargeCustomerInput,
  amountCents: number,
  description: string,
  // Tags the PaymentIntent so the webhook (a belt-and-suspenders backstop
  // for the direct pushInvoicePayment call the caller already makes) can
  // find its way back to the right invoice without guessing.
  metadata?: Record<string, string>
): Promise<{ paymentIntentId: string }> {
  const connection = await getStripeConnection(organizationId);
  if (!connection) {
    throw new Error("Connect Stripe in Settings before charging a card.");
  }
  if (!customer.stripeCustomerId || !customer.stripePaymentMethodId) {
    throw new Error("This customer doesn't have a card on file yet.");
  }
  const stripe = client(connection);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: customer.stripeCustomerId,
      payment_method: customer.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      description,
      metadata,
    });
    return { paymentIntentId: paymentIntent.id };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      throw new Error(`Card declined: ${error.message}`);
    }
    throw new Error("Couldn't charge the card on file — try again, or send a payment link instead.");
  }
}

// Fallback for a customer without a saved card yet (existing/legacy
// customers, or anyone who skipped the card step at booking) — a
// Stripe-hosted Checkout page emailed to them. setup_future_usage means a
// completed payment also saves the card for next time, so this doubles as
// a way to backfill a card on file without a separate flow.
export async function createCheckoutSession(
  organizationId: string,
  customer: { id: string; name: string; email: string; stripeCustomerId: string | null },
  amountCents: number,
  description: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<{ url: string } | null> {
  const connection = await getStripeConnection(organizationId);
  if (!connection) return null;
  const stripe = client(connection);

  let stripeCustomerId = customer.stripeCustomerId;
  if (!stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      name: customer.name,
      email: customer.email,
    });
    stripeCustomerId = stripeCustomer.id;
    await db.customer.update({ where: { id: customer.id }, data: { stripeCustomerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: description },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: { setup_future_usage: "off_session", metadata },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session.url ? { url: session.url } : null;
}

// Verifies and parses an incoming webhook payload. Throws if the
// signature doesn't check out — callers should respond 401 in that case.
export function constructWebhookEvent(
  connection: StripeConnectionRow,
  rawBody: string,
  signature: string
): Stripe.Event {
  if (!connection.webhookSecret) {
    throw new Error("No webhook secret configured for this connection.");
  }
  return client(connection).webhooks.constructEvent(rawBody, signature, connection.webhookSecret);
}
