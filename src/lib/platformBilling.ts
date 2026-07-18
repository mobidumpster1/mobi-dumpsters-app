import Stripe from "stripe";
import { db } from "@/lib/db";

// Chase's own single Stripe account — bills every organization for its
// Solo/Team/Pro subscription. Completely separate from src/lib/stripe.ts,
// which is each *business's own* Stripe account for charging *their*
// customers. Env vars rather than a DB row, since there's only ever one
// platform account, unlike StripeConnection (one per org).
const STRIPE_PLATFORM_SECRET_KEY = process.env.STRIPE_PLATFORM_SECRET_KEY;
const STRIPE_PLATFORM_WEBHOOK_SECRET = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
const STRIPE_PRICE_TEAM = process.env.STRIPE_PRICE_TEAM;
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO;

export function isPlatformBillingConfigured(): boolean {
  return Boolean(STRIPE_PLATFORM_SECRET_KEY && STRIPE_PRICE_TEAM && STRIPE_PRICE_PRO);
}

function client(): Stripe {
  if (!STRIPE_PLATFORM_SECRET_KEY) {
    throw new Error("Platform billing isn't configured yet.");
  }
  return new Stripe(STRIPE_PLATFORM_SECRET_KEY);
}

function priceIdForPlan(plan: "team" | "pro"): string {
  const priceId = plan === "team" ? STRIPE_PRICE_TEAM : STRIPE_PRICE_PRO;
  if (!priceId) {
    throw new Error(`No Stripe price configured for the ${plan} plan yet.`);
  }
  return priceId;
}

// Starts (or resumes) a subscription checkout for an org upgrading to Team
// or Pro. Reuses a past Stripe Customer if this org has ever had a
// PlatformSubscription before (e.g. a previously cancelled one) — same
// create-if-missing pattern createCheckoutSession follows in
// src/lib/stripe.ts, just for a platform Customer instead of a business's
// own customer.
export async function createPlatformCheckoutSession(
  organizationId: string,
  targetPlan: "team" | "pro",
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string } | null> {
  const stripe = client();
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { platformSubscription: true },
  });

  let stripeCustomerId = org.platformSubscription?.stripeCustomerId;
  if (!stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      name: org.name,
      metadata: { organizationId },
    });
    stripeCustomerId = stripeCustomer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceIdForPlan(targetPlan), quantity: 1 }],
    // Set on both the session and the subscription it creates — the
    // checkout.session.completed webhook reads it straight off the
    // session (no extra API call needed), while subscription.metadata
    // keeps it available for later subscription.updated/deleted events.
    metadata: { organizationId, plan: targetPlan },
    subscription_data: { metadata: { organizationId, plan: targetPlan } },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session.url ? { url: session.url } : null;
}

// Stripe's own hosted portal for an existing subscriber to update their
// card, switch plans, or cancel — avoids building that UI by hand.
export async function createBillingPortalSession(
  organizationId: string,
  returnUrl: string
): Promise<{ url: string } | null> {
  const stripe = client();
  const subscription = await db.platformSubscription.findUnique({ where: { organizationId } });
  if (!subscription) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

// Verifies and parses an incoming platform-billing webhook payload — same
// shape as constructWebhookEvent in src/lib/stripe.ts, but checked against
// the platform's own single webhook secret instead of a per-org
// StripeConnection row.
export function constructPlatformWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  if (!STRIPE_PLATFORM_SECRET_KEY || !STRIPE_PLATFORM_WEBHOOK_SECRET) {
    throw new Error("Platform billing isn't configured yet.");
  }
  return new Stripe(STRIPE_PLATFORM_SECRET_KEY).webhooks.constructEvent(
    rawBody,
    signature,
    STRIPE_PLATFORM_WEBHOOK_SECRET
  );
}
