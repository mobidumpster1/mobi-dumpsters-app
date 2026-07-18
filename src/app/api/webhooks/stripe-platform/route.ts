import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { isPlatformBillingConfigured, constructPlatformWebhookEvent } from "@/lib/platformBilling";

// Platform-billing webhook — Chase's own single Stripe account, charging
// each Organization for its Solo/Team/Pro plan. Completely separate from
// src/app/api/webhooks/stripe/route.ts, which handles each *business's
// own* Stripe account (their customer payments) and does a per-connection
// lookup; there's only ever one platform account here, so no connection
// lookup is needed before verifying the signature.
export async function POST(request: Request) {
  if (!isPlatformBillingConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructPlatformWebhookEvent(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") {
      return NextResponse.json({ ok: true });
    }
    const organizationId = session.metadata?.organizationId;
    const plan = session.metadata?.plan;
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (organizationId && plan && stripeCustomerId && stripeSubscriptionId) {
      await db.platformSubscription.upsert({
        where: { organizationId },
        create: { organizationId, stripeCustomerId, stripeSubscriptionId, status: "active" },
        update: { stripeCustomerId, stripeSubscriptionId, status: "active" },
      });
      await db.organization.update({ where: { id: organizationId }, data: { plan } });
    }
  } else if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const organizationId = subscription.metadata?.organizationId;
    if (organizationId) {
      const currentPeriodEndUnix = subscription.items.data[0]?.current_period_end;
      await db.platformSubscription.updateMany({
        where: { organizationId },
        data: {
          status: subscription.status,
          currentPeriodEnd: currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000) : undefined,
        },
      });
    }
  } else if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const organizationId = subscription.metadata?.organizationId;
    if (organizationId) {
      await db.platformSubscription.updateMany({
        where: { organizationId },
        data: { status: "canceled" },
      });
      await db.organization.update({ where: { id: organizationId }, data: { plan: "solo" } });
    }
  }

  return NextResponse.json({ ok: true });
}
