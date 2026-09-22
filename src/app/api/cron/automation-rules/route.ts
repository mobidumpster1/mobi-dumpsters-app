import { NextResponse } from "next/server";
import { runAutomationRules } from "@/lib/automation";
import { requireCronSecret } from "@/lib/cronAuth";

// Hit once a day by Vercel Cron (see vercel.json). Not behind the app's
// password gate (see proxy.ts) since Vercel Cron can't log in — protected
// instead by requireCronSecret, which checks the Authorization header
// Vercel sends against CRON_SECRET.
export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runAutomationRules();
  return NextResponse.json(result);
}
