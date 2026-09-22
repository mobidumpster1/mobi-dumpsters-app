import { NextResponse } from "next/server";

// Vercel Cron can't log in through the app's own password gate (see
// proxy.ts), so every cron route instead checks the Authorization header
// Vercel sends against CRON_SECRET. This fails closed — a route is
// unauthorized both when the header doesn't match AND when CRON_SECRET
// itself isn't configured, so a misconfigured deployment can't
// accidentally leave every cron endpoint open to the public internet.
// CRON_SECRET must be set in Vercel's Production environment variables
// for cron jobs to keep running once this check is in place.
export function requireCronSecret(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
