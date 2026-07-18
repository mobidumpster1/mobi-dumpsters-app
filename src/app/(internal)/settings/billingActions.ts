"use server";

import { headers } from "next/headers";
import { createPlatformCheckoutSession, createBillingPortalSession } from "@/lib/platformBilling";
import { requireUser } from "@/lib/session";

async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") {
    throw new Error("Only the owner can manage billing.");
  }
  return user;
}

async function siteOriginFromRequest(): Promise<string> {
  const host = (await headers()).get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

// Called directly from a client component (not a plain <form action>),
// same reasoning as every other Stripe-adjacent action this session — a
// failure here (billing not configured yet, Stripe error) should surface
// as a friendly inline message, not crash the page.
export async function startPlanCheckout(targetPlan: "team" | "pro"): Promise<string> {
  const owner = await requireOwner();
  const origin = await siteOriginFromRequest();

  const result = await createPlatformCheckoutSession(
    owner.effectiveOrganizationId,
    targetPlan,
    `${origin}/settings?billing_success=1`,
    `${origin}/settings?billing_cancelled=1`
  );
  if (!result) {
    throw new Error("Couldn't start checkout — try again in a moment.");
  }
  return result.url;
}

export async function openBillingPortal(): Promise<string> {
  const owner = await requireOwner();
  const origin = await siteOriginFromRequest();

  const result = await createBillingPortalSession(owner.effectiveOrganizationId, `${origin}/settings`);
  if (!result) {
    throw new Error("No billing account on file yet.");
  }
  return result.url;
}
