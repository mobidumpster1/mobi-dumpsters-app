import { NextResponse } from "next/server";
import { syncAllConnectedOrganizations } from "@/lib/googleSearchConsole";
import { requireCronSecret } from "@/lib/cronAuth";

// Hit once a week by Vercel Cron (see vercel.json) — Search Console data
// is only meaningfully different week to week for a small local-service
// site, so a daily pull would just waste calls. Not behind the app's
// password gate (see proxy.ts) since Vercel Cron can't log in — protected
// instead by requireCronSecret, which checks the Authorization header
// Vercel sends against CRON_SECRET.
export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  await syncAllConnectedOrganizations();
  return NextResponse.json({ ok: true });
}
